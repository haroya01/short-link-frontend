export type PullNotice = "newRows" | "nothingNew" | "caughtUp" | "failed";

export function pullNotice(
  before: ReadonlySet<string>,
  after: readonly string[],
  failed: { own: boolean; remote: boolean },
): PullNotice {
  if (after.some((key) => !before.has(key))) return "newRows";
  if (failed.own || failed.remote) return "failed";
  return after.length === 0 ? "caughtUp" : "nothingNew";
}
