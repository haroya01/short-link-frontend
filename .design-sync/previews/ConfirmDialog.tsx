import { ConfirmDialog } from "url-shortener";

export const Default = () => (
  <ConfirmDialog
    open
    compact
    title="링크를 게시할까요?"
    description="게시하면 누구나 이 단축 링크로 페이지를 열 수 있습니다. 언제든 다시 비공개로 전환할 수 있어요."
    confirmLabel="게시하기"
    cancelLabel="취소"
    onOpenChange={() => {}}
    onConfirm={() => {}}
  />
);

export const Destructive = () => (
  <ConfirmDialog
    open
    compact
    destructive
    title="이 링크를 삭제할까요?"
    description="삭제하면 이 단축 링크로 들어오던 모든 트래픽이 끊깁니다. 이 작업은 되돌릴 수 없습니다."
    confirmLabel="삭제"
    cancelLabel="취소"
    onOpenChange={() => {}}
    onConfirm={() => {}}
  />
);
