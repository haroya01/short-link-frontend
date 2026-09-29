"use client";

import { useMemo, type ReactNode } from "react";
import {
  NextIntlClientProvider,
  useLocale,
  useMessages,
  type AbstractIntlMessages,
} from "next-intl";
import { mergeMessages } from "./client-namespaces";

/**
 * 스코프 메시지를 부모 프로바이더의 메시지 위에 얹는 중첩 프로바이더. next-intl 의 중첩
 * 프로바이더는 messages 를 합치지 않고 통째로 바꾸므로, 부모 것을 스코프가 다시 싣지 않도록
 * 여기서 합친다.
 */
export function ScopedIntlProvider({
  messages,
  children,
}: {
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  const locale = useLocale();
  const inherited = useMessages() as AbstractIntlMessages;
  const merged = useMemo(() => mergeMessages(inherited, messages), [inherited, messages]);
  return (
    <NextIntlClientProvider locale={locale} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
}
