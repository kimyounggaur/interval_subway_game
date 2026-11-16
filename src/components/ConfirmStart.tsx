"use client";

import { useEffect, useRef } from "react";
import "./confirm-start.css";

type Props = {
  description: string;
  onResume: () => void;
  onReplace: () => void;
  onCancel: () => void;
};

export function ConfirmStart({
  description,
  onResume,
  onReplace,
  onCancel,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previous.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const el = dialog.current;
    el?.showModal();
    return () => {
      if (el?.open) el.close();
      previous.current?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="confirm-start"
      aria-labelledby="confirm-start-title"
      aria-describedby="confirm-start-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-start-title">진행 중인 운행이 있어요</h2>
      <p id="confirm-start-description">
        {description} 새 운행을 시작하면 현재 운행은 교체됩니다.
      </p>
      <div className="confirm-start-actions">
        <button className="primary" type="button" autoFocus onClick={onResume}>
          이어하기
        </button>
        <button className="secondary" type="button" onClick={onReplace}>
          새 운행 시작
        </button>
        <button className="secondary" type="button" onClick={onCancel}>
          취소
        </button>
      </div>
    </dialog>
  );
}
