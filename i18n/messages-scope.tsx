import type { ReactNode } from "react";
import { getMessages, setRequestLocale } from "next-intl/server";
import { scopeMessages, type ClientMessageScope } from "./client-namespaces";
import { ScopedIntlProvider } from "./scoped-intl-provider";

/** 스코프 목록의 메시지를 그 아래 클라이언트 컴포넌트에 싣는다(부모 스코프 메시지와 합쳐짐). */
export async function MessagesScope({
  locale,
  scope,
  children,
}: {
  locale: string;
  scope: Exclude<ClientMessageScope, "root">;
  children: ReactNode;
}) {
  const messages = scopeMessages(await getMessages({ locale }), scope);
  return <ScopedIntlProvider messages={messages}>{children}</ScopedIntlProvider>;
}

/**
 * 메시지 스코프만 여는 세그먼트 레이아웃. 정적 렌더에서 레이아웃은 병렬로 돌아 부모의
 * setRequestLocale 이 닿지 않으므로 여기서도 로케일을 고정한다.
 */
export function messagesScopeLayout(scope: Exclude<ClientMessageScope, "root">) {
  return async function MessagesScopeLayout({
    children,
    params,
  }: {
    children: ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
      <MessagesScope locale={locale} scope={scope}>
        {children}
      </MessagesScope>
    );
  };
}
