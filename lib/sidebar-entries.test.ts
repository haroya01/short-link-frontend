import { describe, expect, it } from "vitest";
import { buildBlogSections } from "./sidebar-entries";

// Identity translator — labels come back as their i18n keys, which is enough to assert *which*
// entry rendered without coupling the test to copy.
const t = (key: string) => key;

function hrefs(sections: ReturnType<typeof buildBlogSections>): string[] {
  return sections.flatMap((s) => s.entries.map((e) => e.href));
}

describe("buildBlogSections", () => {
  it("omits the admin section for non-admins", () => {
    const sections = buildBlogSections(t, t, { isAdmin: false });
    const all = hrefs(sections);
    expect(all).not.toContain("/admin");
    expect(all).not.toContain("/admin/metrics");
    // Author entries are always present regardless of role.
    expect(all).toContain("/write");
    expect(all).toContain("/settings");
  });

  it("adds the admin section (moderation + metrics) for admins", () => {
    const sections = buildBlogSections(t, t, { isAdmin: true });
    const all = hrefs(sections);
    expect(all).toContain("/admin");
    expect(all).toContain("/admin/metrics");
  });

  it("keeps the admin entries in their own trailing section", () => {
    const sections = buildBlogSections(t, t, { isAdmin: true });
    const adminSection = sections[sections.length - 1];
    expect(adminSection.entries.map((e) => e.href)).toEqual(["/admin", "/admin/metrics"]);
    expect(adminSection.entries.map((e) => e.label)).toEqual(["moderation", "adminMetrics"]);
  });

  it("only adds the admin section, not extra author entries, when toggling role", () => {
    const asAuthor = hrefs(buildBlogSections(t, t, { isAdmin: false }));
    const asAdmin = hrefs(buildBlogSections(t, t, { isAdmin: true }));
    // The admin view is the author view plus exactly the two admin hrefs.
    expect(asAdmin).toEqual([...asAuthor, "/admin", "/admin/metrics"]);
  });
});
