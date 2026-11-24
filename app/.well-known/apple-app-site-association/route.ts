import { appSiteAssociation } from "@/lib/app-site-association";

export const dynamic = "force-static";

export function GET() {
  return Response.json(appSiteAssociation());
}
