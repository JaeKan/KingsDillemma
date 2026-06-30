import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const tooltipGap = 9;
const tooltipMaxWidth = 280;
const tooltipViewportMargin = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface Position {
  x: number;
  y: number;
  placement: "top" | "bottom";
}

function getTooltipPosition(anchor: HTMLElement, placement: string, tooltip: HTMLElement | null): Position {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const tooltipRect = tooltip?.getBoundingClientRect();
  const maxWidth = Math.min(tooltipMaxWidth, Math.max(0, viewportWidth - tooltipViewportMargin * 2));
  const tooltipWidth = tooltipRect?.width ? Math.min(tooltipRect.width, maxWidth) : maxWidth;
  const tooltipHeight = tooltipRect?.height || 32;
  const minX = tooltipViewportMargin + tooltipWidth / 2;
  const maxX = viewportWidth - tooltipViewportMargin - tooltipWidth / 2;
  const x = minX <= maxX ? clamp(rect.left + rect.width / 2, minX, maxX) : viewportWidth / 2;
  const topRoom = rect.top - tooltipGap - tooltipViewportMargin;
  const bottomRoom = viewportHeight - rect.bottom - tooltipGap - tooltipViewportMargin;
  const canFitTop = topRoom >= tooltipHeight;
  const canFitBottom = bottomRoom >= tooltipHeight;
  const actualPlacement =
    placement === "bottom"
      ? canFitBottom || !canFitTop
        ? "bottom"
        : "top"
      : canFitTop || !canFitBottom
        ? "top"
        : "bottom";
  const y =
    actualPlacement === "top"
      ? clamp(rect.top - tooltipGap, tooltipViewportMargin + tooltipHeight, viewportHeight - tooltipViewportMargin)
      : clamp(rect.bottom + tooltipGap, tooltipViewportMargin, viewportHeight - tooltipViewportMargin - tooltipHeight);

  return { x, y, placement: actualPlacement };
}

interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  placement?: "top" | "bottom" | "auto";
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
}

export function Tooltip({
  label,
  children,
  className = "",
  placement = "auto",
  role,
  tabIndex,
  ariaLabel,
  ...anchorProps
}: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTriggerRef = useRef<"focus" | "pointer" | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0, placement: "top" });
  const tooltipId = useId();
  const hasLabel = Boolean(label);
  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !hasLabel) {
      return;
    }

    setPosition(getTooltipPosition(anchorRef.current, placement, tooltipRef.current));
  }, [hasLabel, placement]);
  const show = useCallback((trigger: "focus" | "pointer") => {
    if (!hasLabel) {
      return;
    }

    openTriggerRef.current = trigger;
    updatePosition();
    setOpen(true);
  }, [hasLabel, updatePosition]);
  const hide = useCallback(() => {
    openTriggerRef.current = null;
    setOpen(false);
  }, []);
  if (!hasLabel && open) {
    setOpen(false);
  }
  const tooltipVisible = open && hasLabel;
  const handleAnchorFocus = useCallback(
    (event: React.FocusEvent<HTMLSpanElement>) => {
      if (!event?.nativeEvent || event.nativeEvent.isTrusted === false) {
        return;
      }

      if (event.currentTarget.matches(":focus-visible")) {
        show("focus");
      }
    },
    [show],
  );
  const handleAnchorMouseEnter = useCallback(() => {
    show("pointer");
  }, [show]);
  const handleAnchorMouseLeave = useCallback(() => {
    hide();
  }, [hide]);

  useLayoutEffect(() => {
    if (tooltipVisible) {
      updatePosition();
    }
  }, [label, tooltipVisible, updatePosition]);

  useEffect(() => {
    if (!tooltipVisible) {
      return undefined;
    }

    const handleUpdate = () => updatePosition();
    const handlePointerMove = (event: PointerEvent) => {
      if (openTriggerRef.current !== "pointer") {
        return;
      }

      const anchor = anchorRef.current;

      if (!anchor || !(event.target instanceof Node)) {
        return;
      }

      if (anchor.contains(event.target)) {
        return;
      }

      hide();
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    document.addEventListener("pointermove", handlePointerMove, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
    };
  }, [hide, tooltipVisible, updatePosition]);

  return (
    <>
      <span
        {...anchorProps}
        ref={anchorRef}
        className={["app-tooltip-anchor", className].filter(Boolean).join(" ")}
        role={role}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        aria-describedby={tooltipVisible ? tooltipId : undefined}
        onPointerDownCapture={hide}
        onMouseDownCapture={hide}
        onClickCapture={hide}
        onKeyDownCapture={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            hide();
          }
        }}
        onBlur={hide}
        onFocus={handleAnchorFocus}
        onMouseEnter={handleAnchorMouseEnter}
        onMouseLeave={handleAnchorMouseLeave}
        onPointerEnter={handleAnchorMouseEnter}
        onPointerLeave={handleAnchorMouseLeave}
        onPointerDown={hide}
      >
        {children}
      </span>
      {tooltipVisible && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              className={`app-tooltip app-tooltip-${position.placement}`}
              role="tooltip"
              style={{ "--tooltip-x": `${position.x}px`, "--tooltip-y": `${position.y}px` } as React.CSSProperties}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
