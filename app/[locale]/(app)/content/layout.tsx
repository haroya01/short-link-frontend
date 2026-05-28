"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { MobileSidebar, Sidebar } from "@/components/common/sidebar";
import { buildContentSections } from "@/lib/sidebar-entries";
import { markLastArea } from "@/lib/use-last-area";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const tContent = useTranslations("sidebar.content");
  const tCommon = useTranslations("sidebar.common");
  const { isAdmin } = useAuth();

  useEffect(() => {
    markLastArea("content");
  }, []);

  const sections = buildContentSections(tContent, tCommon, { isAdmin });

  return (
    <>
      <Sidebar sections={sections} />
      <MobileSidebar sections={sections} />
      <main className="min-w-0 flex-1">{children}</main>
    </>
  );
}
