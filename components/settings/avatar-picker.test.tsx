import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  presign: vi.fn(),
  upload: vi.fn(),
  commit: vi.fn(),
  remove: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/api", () => ({
  presignAvatarUpload: mocks.presign,
  uploadAvatarToS3: mocks.upload,
  commitAvatarUpload: mocks.commit,
  deleteAvatar: mocks.remove,
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => (_err: unknown, fallback: string) => fallback }));
vi.mock("@/components/ui/image-cropper-dialog", () => ({
  ImageCropperDialog: ({ open, onConfirm }: { open: boolean; onConfirm: (file: File) => void }) =>
    open ? (
      <button type="button" data-testid="crop" onClick={() => onConfirm(new File(["x"], "c.jpg", { type: "image/jpeg" }))}>
        crop
      </button>
    ) : null,
}));

import { AvatarPicker } from "./avatar-picker";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.presign.mockResolvedValue({ uploadUrl: "https://s3/put", key: "k1", maxBytes: 1024 });
  mocks.upload.mockResolvedValue(undefined);
  mocks.commit.mockResolvedValue({ avatarUrl: "https://cdn/new.jpg" });
  mocks.remove.mockResolvedValue(undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function pickAndCrop() {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", {
    value: [new File(["raw"], "raw.png", { type: "image/png" })],
    configurable: true,
  });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="crop"]')!.click());
}

describe("AvatarPicker (card editor)", () => {
  it("uploads the cropped photo and reports the new URL right away", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(<AvatarPicker currentUrl={null} initialChar="D" onChange={onChange} />));

    await pickAndCrop();

    expect(mocks.presign).toHaveBeenCalledWith("image/jpeg");
    expect(mocks.upload).toHaveBeenCalledWith("https://s3/put", expect.any(File), "image/jpeg");
    expect(mocks.commit).toHaveBeenCalledWith("k1");
    expect(onChange).toHaveBeenCalledWith("https://cdn/new.jpg");
    expect(mocks.toast).toHaveBeenCalledWith("uploaded", "success");
  });

  it("stops before the upload when the cropped file is over the presigned cap", async () => {
    mocks.presign.mockResolvedValue({ uploadUrl: "https://s3/put", key: "k1", maxBytes: 0 });
    const onChange = vi.fn();
    await act(async () => root.render(<AvatarPicker currentUrl={null} initialChar="D" onChange={onChange} />));

    await pickAndCrop();

    expect(mocks.upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith("tooBig", "error");
  });

  it("deletes the photo as soon as remove is pressed", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(<AvatarPicker currentUrl="https://cdn/old.jpg" initialChar="D" onChange={onChange} />));

    const remove = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("remove"))!;
    await act(async () => remove.click());

    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
