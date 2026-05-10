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
  const show = useCallback(() => {
    if (!hasLabel) {
      return;
    }

    updatePosition();
    setOpen(true);
  }, [hasLabel, updatePosition]);
  const hide = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [label, open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleUpdate = () => updatePosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <span
        {...anchorProps}
        ref={anchorRef}
        className={["app-tooltip-anchor", className].filter(Boolean).join(" ")}
        role={role}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        aria-describedby={open && hasLabel ? tooltipId : undefined}
        onBlur={hide}
        onFocus={show}
        onMouseEnter={show}
        onMouseLeave={hide}
        onPointerDown={hide}
      >
        {children}
      </span>
      {open && hasLabel && typeof document !== "undefined"
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
