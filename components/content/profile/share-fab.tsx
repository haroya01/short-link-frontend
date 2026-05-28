"use client";

import { QrButton } from "@/components/links/qr/button";

/**
 * Public-profile share entry point. Anyone visiting the page can grab the QR — useful when the
 * profile owner wants to share their bio link offline (poster, business card) but is surfaced to
 * any visitor for instant share. The owner's edit FAB sits opposite it on the right side.
 */
export function ProfileShareFab({ url, filename }: { url: string; filename: string }) {
  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-5 z-[55]">
      <QrButton
        url={url}
        filename={filename}
        logoSrc="/icon.svg"
        showSrcInput={false}
        defaultSrcHint="profile"
      />
    </div>
  );
}
