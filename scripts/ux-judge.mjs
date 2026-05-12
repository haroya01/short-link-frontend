/**
 * Daily UX inspection — captures screenshots of fixture pages, asks Claude to review for visual
 * design / a11y / layout issues, posts findings as a GitHub issue. Runs from a cron workflow,
 * not from PR checks; the goal is qualitative feedback ("does this still look good as the codebase
 * evolves?") that complements the deterministic snapshot + axe gates.
 *
 * Required env:
 *   ANTHROPIC_API_KEY     — Anthropic API token (Claude vision)
 *   LLM_JUDGE_BASE_URL    — defaults to http://localhost:3001 (the Next.js server)
 *   GITHUB_TOKEN          — GitHub Actions provides this; needed to create issues
 *   GITHUB_REPOSITORY     — "owner/repo"; provided by GitHub Actions runtime
 *
 * Behavior:
 *   1. Launches headless chromium, visits each fixture page, takes a viewport screenshot.
 *   2. Sends each screenshot + a structured prompt to Claude (claude-3-5-sonnet) asking for
 *      design / a11y / layout issues. Asks for a short JSON envelope so parsing is reliable.
 *   3. Aggregates findings across pages. If ANY page reports issues, opens a GitHub issue
 *      labeled "ai-ux-feedback" with the list. Dedupes against today's date so a single cron
 *      run never opens more than one issue per day.
 *
 * Cost guardrail: vision calls are bounded by FIXTURES.length (currently 4). Each screenshot is
 * compressed to ~100KB; per-call cost is cents. Daily cap < $1.
 */

import { chromium } from "playwright";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BASE_URL = process.env.LLM_JUDGE_BASE_URL || "http://localhost:3001";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const FIXTURES = [
  "contact-card-amethyst",
  "contact-card-rose-gold",
  "contact-card-emerald",
  "contact-card-midnight",
];

const PROMPT = `You're reviewing a digital business card component from a Linktree-like SaaS, holographic foil aesthetic.

Look at this screenshot and identify ONLY clear UX, accessibility, or visual-design problems. Be terse and concrete. Skip subjective polish ("could be better"), only flag actual issues:
- text/UI cutoff or overflow
- unreadable contrast / illegible text
- broken layouts / overlapping elements
- missing affordances visitors would need
- visible glitches (rendering artifacts, wrong colors)
- accessibility concerns visible from the screenshot

Respond ONLY with valid JSON in this exact shape:
{"issues": [{"severity": "critical|major|minor", "where": "short location", "what": "what is wrong"}]}

If no issues, return: {"issues": []}`;

if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY not set; aborting.");
  process.exit(0);
}

async function judgeOne(b64Image, slug) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      // Sonnet 4.6 — flagship mid-tier in the Claude 4.x family. Better at catching subtle
      // UX / a11y issues than Haiku without paying Opus prices (~$1/month for our 1× daily
      // 4-page cron). Swap to claude-haiku-4-5-20251001 to cut cost ~3× or claude-opus-4-7
      // for sharper judgment at ~5× cost.
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: b64Image },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`Claude API ${res.status} for ${slug}:`, await res.text());
    return [];
  }
  const json = await res.json();
  const raw = json.content?.[0]?.text ?? "";
  // Strip markdown code fences if the model wrapped JSON in them.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed.issues) ? parsed.issues : [];
  } catch (e) {
    console.error(`Failed to parse Claude response for ${slug}:`, raw);
    return [];
  }
}

async function postIssue(findings) {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.log("No GITHUB_TOKEN / REPOSITORY — skipping issue creation. Findings:");
    console.log(JSON.stringify(findings, null, 2));
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const title = `[ai-ux-feedback] ${today}`;
  // Dedupe: skip if an open issue with the same title already exists.
  const searchRes = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(
      `repo:${GITHUB_REPOSITORY} is:issue is:open in:title "${title}"`,
    )}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } },
  );
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.total_count > 0) {
      console.log(`Issue ${title} already open; skipping.`);
      return;
    }
  }
  const body = [
    "Automated UX inspection by the daily LLM judge. Skim, dismiss false positives, file follow-ups for real ones.",
    "",
    ...findings.flatMap(({ page, issues }) => [
      `### ${page}`,
      ...issues.map((i) => `- **${i.severity}** at \`${i.where}\` — ${i.what}`),
      "",
    ]),
  ].join("\n");
  const createRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ title, body, labels: ["ai-ux-feedback"] }),
    },
  );
  if (!createRes.ok) {
    console.error(`Failed to create issue: ${createRes.status}`, await createRes.text());
    process.exit(1);
  }
  const created = await createRes.json();
  console.log(`Created ${created.html_url}`);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const findings = [];
  try {
    for (const slug of FIXTURES) {
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/ko/visual-fixtures/${slug}`);
      await page.getByTestId("fixture").waitFor({ state: "visible", timeout: 10_000 });
      // Settle: let fonts + initial paint complete.
      await page.waitForTimeout(400);
      const buf = await page.screenshot({ fullPage: false, type: "png" });
      await page.close();
      const issues = await judgeOne(buf.toString("base64"), slug);
      if (issues.length > 0) {
        findings.push({ page: slug, issues });
      }
      console.log(`${slug}: ${issues.length} issue(s)`);
    }
  } finally {
    await browser.close();
  }
  if (findings.length === 0) {
    console.log("No issues found by judge. Skipping issue creation.");
    return;
  }
  await postIssue(findings);
}

main().catch((err) => {
  console.error("UX judge failed:", err);
  process.exit(1);
});
