"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type CreateModalProps = {
  title: string;
  description: string;
  context: ReactNode;
  identity?: ReactNode;
  children: ReactNode;
  closeHref?: string;
  onClose?: () => void;
  size?: "compact" | "default" | "large";
  allowFullscreen?: boolean;
  hideContext?: boolean;
};

export function CreateModal({ title, description, context, identity, children, closeHref, onClose, size = "default", allowFullscreen = true, hideContext = false }: CreateModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      if (onClose) onClose();
      else if (closeHref) router.push(closeHref);
      else dialogRef.current?.close();
    }, 210);
  };

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, []);

  return <dialog
    ref={dialogRef}
    className={`create-modal create-modal-${size} ${fullscreen ? "is-fullscreen" : ""} ${closing ? "is-closing" : ""}`}
    aria-label={title}
    aria-describedby="create-modal-description"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => {
      if (event.target === event.currentTarget) { close(); return; }
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (closeHref && anchor?.getAttribute("href") === closeHref) { event.preventDefault(); close(); }
    }}
  >
    <div className="create-modal-panel">
      <header className={`create-modal-header ${hideContext ? "is-contextless" : ""}`}>
        {hideContext ? <strong className="create-modal-title">{title}</strong> : <div className="create-modal-context">{identity ?? <span className="create-modal-team">RW</span>}<span aria-hidden="true">›</span><strong>{context}</strong></div>}
        <span className="sr-only" id="create-modal-description">{description}</span>
        <div className="create-modal-window-actions">
          {allowFullscreen ? <button className="icon-button" type="button" disabled={closing} data-tooltip={fullscreen ? "Exit full screen" : "Open full screen"} aria-label={fullscreen ? "Exit full screen" : "Open full screen"} aria-pressed={fullscreen} onClick={() => setFullscreen((current) => !current)}>{fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button> : null}
          <button className="icon-button" type="button" disabled={closing} data-tooltip="Close" aria-label={`Close ${title}`} onClick={close}><X aria-hidden="true" /></button>
        </div>
      </header>
      <div className="create-modal-body">{children}</div>
    </div>
  </dialog>;
}
