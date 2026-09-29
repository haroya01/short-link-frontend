import type { Metadata } from "next";
import { messagesScopeLayout } from "@/i18n/messages-scope";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default messagesScopeLayout("links/auth");
