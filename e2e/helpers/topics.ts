type Extra = { language?: string | null; own?: boolean; people?: number; related?: unknown[] };

export function topicTag(tag: string, { language = "ko", own = true, people = 5, related = [] }: Extra = {}) {
  return {
    id: `tag:${tag.toLowerCase()}`,
    kind: "tag",
    tag,
    url: null,
    title: null,
    source: null,
    image: null,
    language,
    own,
    people,
    servers: ["moim.example"],
    related,
  };
}

export function topicLink(
  url: string,
  title: string,
  source: string | null,
  { language = "ko", own = true, people = 5 }: Extra = {},
) {
  return {
    id: `link:${url}`,
    kind: "link",
    tag: null,
    url,
    title,
    source,
    image: null,
    language,
    own,
    people,
    servers: ["moim.example"],
    related: [],
  };
}
