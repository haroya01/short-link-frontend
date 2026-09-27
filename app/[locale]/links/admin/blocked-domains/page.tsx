import { guardAdminServer } from "@/lib/admin-guard";
import { AdminBlockedDomainsView } from "./blocked-domains-view";

export const dynamic = "force-dynamic";

export default function AdminBlockedDomainsPage() {
  guardAdminServer();
  return <AdminBlockedDomainsView />;
}
