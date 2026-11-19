"use client";

import { useTranslations } from "next-intl";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import type { TopicArticle } from "@/modules/notes/api/topics";
import { linkHost } from "@/modules/notes/lib/topics";
import { useTopicPosts } from "@/modules/notes/lib/use-topics";
import { TopicPosts } from "./topic-posts";

export function TaggedNotes({ tag }: { tag: string }) {
  const t = useTranslations("notes");
  const { notes, topic } = useTopicPosts({ tag });
  const related = topic?.kind === "tag" ? topic.related : [];
  return (
    <TopicPosts
      key={tag}
      notes={notes}
      above={related.length > 0 ? <RelatedArticles articles={related} /> : undefined}
      empty={<BlogEmpty title={t("emptyTag")} />}
    />
  );
}

function RelatedArticles({ articles }: { articles: TopicArticle[] }) {
  const t = useTranslations("notes");
  return (
    <section
      aria-labelledby="related-articles"
      data-testid="related-articles"
      className="border-b border-slate-100 pb-2 pt-5 dark:border-slate-800"
    >
      <RailHeading id="related-articles">{t("relatedArticles")}</RailHeading>
      <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
        {articles.map((article) => (
          <li key={article.url}>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="focus-ring -mx-2 block rounded-surface px-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <span className="line-clamp-2 text-[15px] font-medium leading-snug text-slate-900 dark:text-slate-100">
                {article.title}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-slate-500 dark:text-slate-400">
                {article.source || linkHost(article.url)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
