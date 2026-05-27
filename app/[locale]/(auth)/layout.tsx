import { AppProviders } from "@/components/common/app-providers";

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <main className="flex-1">{children}</main>
    </AppProviders>
  );
}
