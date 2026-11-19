export type ExploreLane = "trends" | "people";

export const EXPLORE_LANES: readonly ExploreLane[] = ["trends", "people"];

export function laneOf(value: string | null): ExploreLane {
  return value === "people" ? "people" : "trends";
}

export function laneSearch(search: string, lane: ExploreLane): string {
  const params = new URLSearchParams(search);
  const current = params.get("lane");
  if (lane === "trends" ? current === null : current === lane) return search;
  if (lane === "trends") params.delete("lane");
  else params.set("lane", lane);
  const query = params.toString();
  return query ? `?${query}` : "";
}
