import { useEffect, useState } from "react";

type AgendaFocusListener = () => void;

export function isAgendaWindowFocused(): boolean {
  if (typeof document === "undefined") {
    return true;
  }

  if (document.visibilityState !== "visible") {
    return false;
  }

  const currentWindow = typeof window !== "undefined" ? (window as Window & { hasFocus?: () => boolean }) : null;

  if (typeof currentWindow?.hasFocus === "function") {
    return currentWindow.hasFocus();
  }

  return true;
}

export function subscribeAgendaWindowFocus(listener: AgendaFocusListener): () => void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.addEventListener !== "function" ||
    typeof document.addEventListener !== "function"
  ) {
    return () => undefined;
  }

  window.addEventListener("focus", listener, false);
  window.addEventListener("blur", listener, false);
  document.addEventListener("visibilitychange", listener, false);

  return () => {
    window.removeEventListener("focus", listener);
    window.removeEventListener("blur", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export function useAgendaWindowFocus(): boolean {
  const [focused, setFocused] = useState(isAgendaWindowFocused);

  useEffect(() => {
    const updateFocus = () => setFocused(isAgendaWindowFocused());

    updateFocus();
    return subscribeAgendaWindowFocus(updateFocus);
  }, []);

  return focused;
}
