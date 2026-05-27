import { AppProviders } from "@/components/common/app-providers";
import { ClaimToastListener } from "@/components/common/claim-toast-listener";
import { CookieConsent } from "@/components/common/cookie-consent";
import { Footer } from "@/components/common/footer";
import { Nav } from "@/components/common/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
      <ClaimToastListener />
    </AppProviders>
  );
}
