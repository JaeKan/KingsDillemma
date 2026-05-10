import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors, DragStartEvent, DragMoveEvent, DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { TokenIcon } from "./GameIcons";
import { getHouseHoverLabel, getVoteOrderHouses, isVoteOrderSettingLocked, getHouseKoreanName } from "../utils/house-helpers";
import { RedactedHouse, RedactedState, HouseId } from "../types/game";
import { HouseCrestBadge } from "./DilemmaUI";
import { ko } from "../resources/gameResources";

function getPointerPoint(event: any) {
  if (!event) {
    return null;
  }

  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    return { x: event.clientX, y: event.clientY };
  }

  const touch = event.touches?.[0] || event.changedTouches?.[0];

  if (touch && typeof touch.clientX === "number" && typeof touch.clientY === "number") {
    return { x: touch.clientX, y: touch.clientY };
  }

  return null;
}

function keepVoteOrderDragOverlayInsideRing({ activeNodeRect, activatorEvent, overlayNodeRect, transform }: any) {
  if (!activeNodeRect || !overlayNodeRect) {
    return transform;
  }

  const pointerPoint = getPointerPoint(activatorEvent);
  let nextTransform = transform;

  if (pointerPoint) {
    nextTransform = {
      ...transform,
      x: transform.x + pointerPoint.x - activeNodeRect.left - overlayNodeRect.width / 2,
      y: transform.y + pointerPoint.y - activeNodeRect.top - overlayNodeRect.height / 2,
    };
  }

  if (typeof document === "undefined") {
    return nextTransform;
  }

  const ringElement = (document.querySelector(".vote-order-ring.is-dragging") || document.querySelector(".vote-order-dialog .vote-order-ring")) as HTMLElement | null;
  const ringRect = ringElement?.getBoundingClientRect();

  if (!ringRect) {
    return nextTransform;
  }

  const overlayRadius = Math.max(overlayNodeRect.width, overlayNodeRect.height) / 2;
  const ringCenterX = ringRect.left + ringRect.width / 2;
  const ringCenterY = ringRect.top + ringRect.height / 2;
  const radiusX = Math.max(0, ringRect.width / 2 - overlayRadius - 1);
  const radiusY = Math.max(0, ringRect.height / 2 - overlayRadius - 1);
  const overlayCenterX = activeNodeRect.left + nextTransform.x + overlayNodeRect.width / 2;
  const overlayCenterY = activeNodeRect.top + nextTransform.y + overlayNodeRect.height / 2;
  const deltaX = overlayCenterX - ringCenterX;
  const deltaY = overlayCenterY - ringCenterY;

  if (!radiusX || !radiusY) {
    return {
      ...nextTransform,
      x: nextTransform.x + ringCenterX - overlayCenterX,
      y: nextTransform.y + ringCenterY - overlayCenterY,
    };
  }

  const normalizedDistance = Math.hypot(deltaX / radiusX, deltaY / radiusY);

  if (normalizedDistance <= 1) {
    return nextTransform;
  }

  const clampedCenterX = ringCenterX + deltaX / normalizedDistance;
  const clampedCenterY = ringCenterY + deltaY / normalizedDistance;

  return {
    ...nextTransform,
    x: nextTransform.x + clampedCenterX - overlayCenterX,
    y: nextTransform.y + clampedCenterY - overlayCenterY,
  };
}

const voteOrderDragOverlayModifiers = [keepVoteOrderDragOverlayInsideRing];

function getVoteOrderSeatTransform(angle: number) {
  return `translate(-50%, -50%) rotate(${angle}deg) translate(var(--seat-radius)) rotate(${-angle}deg)`;
}

interface VoteOrderSeatContentsProps {
  house: RedactedHouse | undefined;
  index: number;
  disableTooltip?: boolean;
}

function VoteOrderSeatContents({ house, index, disableTooltip = false }: VoteOrderSeatContentsProps) {
  if (!house) return null;
  const houseName = getHouseKoreanName(house);
  const displayName = house?.hasCustomName && house.name ? house.name : houseName;
  const showCanonicalName = Boolean(house?.hasCustomName && house.name && houseName !== displayName);

  return (
    <>
      <span className="vote-order-seat-face" aria-hidden="true">
        <HouseCrestBadge
          house={house}
          className="vote-order-rank"
          ariaLabel={ko.voteOrder.seatAria(index + 1, getHouseHoverLabel(house))}
          disableTooltip={disableTooltip}
        />
      </span>
      <span className="vote-order-house">
        <strong className="vote-order-house-primary">{displayName}</strong>
        {showCanonicalName ? <small className="vote-order-house-secondary">{houseName}</small> : null}
      </span>
    </>
  );
}

interface DraggableVoteOrderSeatProps {
  active: boolean;
  disabled: boolean;
  house: RedactedHouse | undefined;
  id: HouseId;
  index: number;
  previewTarget: boolean;
  total: number;
  instructionsId: string;
  onKeyboardMove?: (id: HouseId, step: number) => void;
  onKeyboardMoveTo?: (id: HouseId, targetIndex: number) => void;
}

function DraggableVoteOrderSeat({
  active,
  disabled,
  house,
  id,
  index,
  previewTarget,
  total,
  instructionsId,
  onKeyboardMove,
  onKeyboardMoveTo,
}: DraggableVoteOrderSeatProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ 
    id, 
    disabled,
  });
  const { onKeyDown: handleDraggableKeyDown, ...dragListeners } = (listeners as any) || {};
  const angle = total > 0 ? -90 + (360 / total) * index : -90;
  const displayName = getHouseHoverLabel(house);
  const style = {
    "--seat-index": index,
    "--seat-angle": `${angle}deg`,
    transform: getVoteOrderSeatTransform(angle),
  } as React.CSSProperties;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!disabled) {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onKeyboardMove?.(id, -1);
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onKeyboardMove?.(id, 1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        onKeyboardMoveTo?.(id, 0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        onKeyboardMoveTo?.(id, total - 1);
        return;
      }
    }

    handleDraggableKeyDown?.(event);
  };

  return (
    <button
      ref={setNodeRef}
      className={`vote-order-seat${active || isDragging ? " placeholder" : ""}${previewTarget ? " drop-target" : ""}${disabled ? " disabled" : ""}`}
      style={style}
      type="button"
      disabled={disabled}
      aria-label={ko.voteOrder.seatKeyboardMoveAria(index + 1, displayName)}
      {...attributes}
      aria-describedby={`${(attributes as any)["aria-describedby"] || ""} ${instructionsId}`.trim()}
      {...dragListeners}
      onKeyDown={handleKeyDown}
    >
      <VoteOrderSeatContents house={house} index={index} disableTooltip={active || isDragging} />
    </button>
  );
}

interface VoteOrderDragPreviewProps {
  house: RedactedHouse;
  index: number;
}

function VoteOrderDragPreview({ house, index }: VoteOrderDragPreviewProps) {
  return (
    <div className="vote-order-seat vote-order-seat-preview">
      <VoteOrderSeatContents house={house} index={index} disableTooltip />
    </div>
  );
}

interface VoteOrderDialogProps {
  busy: boolean;
  open: boolean;
  state: RedactedState | null;
  onClose: () => void;
  onSave: (data: { voteOrder: HouseId[] }) => Promise<boolean>;
  restoreFocusRef: React.RefObject<HTMLElement>;
}

function VoteOrderDialog({ busy, open, state, onClose, onSave, restoreFocusRef }: VoteOrderDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dragStartOrderRef = useRef<string[]>([]);
  const dragPointerOffsetRef = useRef({ x: 0, y: 0 });
  const lastDragTargetIndexRef = useRef(-1);
  const houses = useMemo(() => (state ? getVoteOrderHouses(state) : []), [state]);
  const initialOrder = useMemo(() => {
    return houses.map((house) => house.id);
  }, [houses]);
  const [draftOrder, setDraftOrder] = useState<string[]>(initialOrder);
  const [dragOrderSnapshot, setDragOrderSnapshot] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState("");
  const [dragTargetIndex, setDragTargetIndex] = useState(-1);
  const [saveStatus, setSaveStatus] = useState("");
  const [dragAnnouncement, setDragAnnouncement] = useState("");
  const locked = Boolean(state && isVoteOrderSettingLocked(state));
  const canSave = !busy && !locked && draftOrder.length > 0;
  const houseById = useMemo(() => new Map(houses.map((house) => [house.id, house])), [houses]);
  const activeDragHouse = activeDragId ? houseById.get(activeDragId) : null;
  const renderedOrder = useMemo(() => {
    if (!activeDragId || dragTargetIndex < 0) {
      return draftOrder;
    }

    const baseOrder = dragOrderSnapshot.length ? dragOrderSnapshot : draftOrder;
    const oldIndex = baseOrder.indexOf(activeDragId);

    if (oldIndex < 0 || oldIndex === dragTargetIndex) {
      return baseOrder;
    }

    return arrayMove(baseOrder, oldIndex, dragTargetIndex);
  }, [activeDragId, draftOrder, dragOrderSnapshot, dragTargetIndex]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setDraftOrder(initialOrder);
        setActiveDragId("");
        setDragTargetIndex(-1);
        setSaveStatus("");
        setDragAnnouncement("");
        setDragOrderSnapshot([]);
      });
      dragStartOrderRef.current = [];
      dragPointerOffsetRef.current = { x: 0, y: 0 };
      lastDragTargetIndexRef.current = -1;
    }
  }, [initialOrder, open]);

  useEffect(() => {
    const draggingClassName = "vote-order-dragging";

    if (open && activeDragId) {
      document.body.classList.add(draggingClassName);
    } else {
      document.body.classList.remove(draggingClassName);
    }

    return () => {
      document.body.classList.remove(draggingClassName);
    };
  }, [activeDragId, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;

    const focusFirstControl = window.setTimeout(() => {
      const firstControl = dialogRef.current?.querySelector(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement | null;
      firstControl?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        (dialogRef.current as HTMLElement).querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0) as HTMLElement[];

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (focusFirstControl) window.clearTimeout(focusFirstControl);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current as any);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  const getVoteOrderIndexFromPoint = useCallback(
    (x: number, y: number) => {
      const ringRect = ringRef.current?.getBoundingClientRect();

      if (!ringRect || draftOrder.length === 0) {
        return -1;
      }

      const centerX = ringRect.left + ringRect.width / 2;
      const centerY = ringRect.top + ringRect.height / 2;
      const deltaX = x - centerX;
      const deltaY = y - centerY;

      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
      const normalized = (angle + 90 + 360) % 360;
      const segment = 360 / draftOrder.length;

      return Math.floor((normalized + segment / 2) / segment) % draftOrder.length;
    },
    [draftOrder.length],
  );

  const moveSeatToIndex = useCallback(
    (seatId: string, targetIndex: number) => {
      if (locked) {
        return;
      }

      const oldIndex = draftOrder.indexOf(seatId);
      const nextIndex = Math.max(0, Math.min(draftOrder.length - 1, targetIndex));

      if (oldIndex < 0 || oldIndex === nextIndex) {
        return;
      }

      setDraftOrder(arrayMove(draftOrder, oldIndex, nextIndex));
      const mover = houseById.get(seatId);
      const moverLabel = mover ? getHouseHoverLabel(mover) : ko.voteOrder.dragUnknown;
      setDragAnnouncement(ko.voteOrder.dragMoved(moverLabel, nextIndex + 1));
    },
    [draftOrder, houseById, locked],
  );

  const moveSeatByStep = useCallback(
    (seatId: string, step: number) => {
      const oldIndex = draftOrder.indexOf(seatId);

      if (locked || oldIndex < 0 || draftOrder.length < 2) {
        return;
      }

      const nextIndex = (oldIndex + step + draftOrder.length) % draftOrder.length;

      if (oldIndex === nextIndex) {
        return;
      }

      setDraftOrder(arrayMove(draftOrder, oldIndex, nextIndex));
      const mover = houseById.get(seatId);
      const moverLabel = mover ? getHouseHoverLabel(mover) : ko.voteOrder.dragUnknown;
      setDragAnnouncement(ko.voteOrder.dragMoved(moverLabel, nextIndex + 1));
    },
    [draftOrder, houseById, locked],
  );

  const getActivatorPoint = (event: any) => getPointerPoint(event?.activatorEvent);

  const getCurrentDragPoint = (event: any) => {
    const initialRect = event.active?.rect?.current?.initial;

    if (!initialRect) {
      return null;
    }

    const offset = dragPointerOffsetRef.current;
    const delta = event.delta || { x: 0, y: 0 };

    return {
      x: initialRect.left + initialRect.width / 2 + delta.x + offset.x,
      y: initialRect.top + initialRect.height / 2 + delta.y + offset.y,
    };
  };

  const getDragTargetIndex = (event: any) => {
    const dragPoint = getCurrentDragPoint(event);

    if (!dragPoint) {
      return -1;
    }

    return getVoteOrderIndexFromPoint(dragPoint.x, dragPoint.y);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (locked) {
      return;
    }

    const activeId = String(event.active.id);
    const initialRect = event.active?.rect?.current?.initial;
    const activatorPoint = getActivatorPoint(event);

    if (initialRect && activatorPoint) {
      dragPointerOffsetRef.current = {
        x: activatorPoint.x - (initialRect.left + initialRect.width / 2),
        y: activatorPoint.y - (initialRect.top + initialRect.height / 2),
      };
    } else {
      dragPointerOffsetRef.current = { x: 0, y: 0 };
    }

    const startIndex = draftOrder.indexOf(activeId);

    const startOrder = [...draftOrder];
    dragStartOrderRef.current = startOrder;
    setDragOrderSnapshot(startOrder);
    lastDragTargetIndexRef.current = startIndex;
    setDragTargetIndex(startIndex);
    setActiveDragId(activeId);
    const house = houseById.get(activeId);
    const label = house ? getHouseHoverLabel(house) : ko.voteOrder.dragUnknown;
    setDragAnnouncement(ko.voteOrder.dragMove(label));
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (locked || !event.active?.id) {
      return;
    }

    const targetIndex = getDragTargetIndex(event);

    if (targetIndex < 0) {
      return;
    }

    setDragTargetIndex(targetIndex);

    if (targetIndex === lastDragTargetIndexRef.current) {
      return;
    }

    lastDragTargetIndexRef.current = targetIndex;
    const house = houseById.get(String(event.active.id));
    const label = house ? getHouseHoverLabel(house) : ko.voteOrder.dragUnknown;
    setDragAnnouncement(ko.voteOrder.dragCanDrop(label, targetIndex + 1));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = event.active?.id ? String(event.active.id) : "";
    const targetIndex = getDragTargetIndex(event);
    const baseOrder = dragStartOrderRef.current.length ? dragStartOrderRef.current : draftOrder;
    const oldIndex = baseOrder.indexOf(activeId);

    if (!locked && activeId && targetIndex >= 0 && oldIndex >= 0 && oldIndex !== targetIndex) {
      setDraftOrder(arrayMove(baseOrder, oldIndex, targetIndex));
      const house = houseById.get(activeId);
      const label = house ? getHouseHoverLabel(house) : ko.voteOrder.dragUnknown;
      setDragAnnouncement(ko.voteOrder.dragMoved(label, targetIndex + 1));
    }

    dragStartOrderRef.current = [];
    setDragOrderSnapshot([]);
    dragPointerOffsetRef.current = { x: 0, y: 0 };
    lastDragTargetIndexRef.current = -1;
    setDragTargetIndex(-1);
    setActiveDragId("");
  };

  const handleDragCancel = () => {
    if (dragStartOrderRef.current.length) {
      setDraftOrder(dragStartOrderRef.current);
    }

    dragStartOrderRef.current = [];
    setDragOrderSnapshot([]);
    dragPointerOffsetRef.current = { x: 0, y: 0 };
    lastDragTargetIndexRef.current = -1;
    setDragTargetIndex(-1);
    setDragAnnouncement(ko.voteOrder.dragCancel);
    setActiveDragId("");
  };

  if (!open) {
    return null;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setSaveStatus("");
    const result = await onSave({
      voteOrder: draftOrder,
    });

    if (result) {
      setSaveStatus(ko.voteOrder.saveOk);
      closeTimerRef.current = window.setTimeout(onClose, 650);
      return;
    }

    setSaveStatus(ko.voteOrder.saveFail);
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className={`vote-order-dialog${activeDragId ? " is-dragging-vote-order" : ""}`}
        aria-labelledby="vote-order-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="turn" />
          </span>
          <div>
            <p className="section-label">{ko.voteOrder.section}</p>
            <h2 id="vote-order-title">{ko.voteOrder.title}</h2>
          </div>
        </div>
        <form className="vote-order-form" onSubmit={submit}>
          <div className="vote-order-copy">
            <p>{ko.voteOrder.copyP1}</p>
            <p>{ko.voteOrder.copyP2}</p>
          </div>
          {locked ? (
            <p className="vote-order-warning" role="status">
              {ko.voteOrder.locked}
            </p>
          ) : null}
          {draftOrder.length > 0 ? (
            <DndContext
              sensors={sensors}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
              onDragMove={handleDragMove}
              onDragStart={handleDragStart}
            >
              <p className="vote-order-assistive" id="vote-order-keyboard-help">
                {ko.voteOrder.keyboardHelp}
              </p>
              <ol className="vote-order-assistive" id="vote-order-summary" aria-label={ko.voteOrder.orderSummaryAria}>
                {renderedOrder.map((houseId, index) => {
                  const h = houseById.get(houseId);
                  return (
                  <li key={houseId}>
                    {ko.voteOrder.seatAria(index + 1, h ? getHouseHoverLabel(h) : ko.voteOrder.dragUnknown)}
                  </li>
                  );
                })}
              </ol>
              <p className="vote-order-assistive" role="status" aria-live="polite" aria-atomic="true">
                {dragAnnouncement}
              </p>
              <div
                className={`vote-order-ring${activeDragId ? " is-dragging" : ""}`}
                aria-label={ko.voteOrder.ringAria}
                aria-describedby="vote-order-keyboard-help vote-order-summary"
                ref={ringRef}
                role="group"
                style={{ "--seat-count": draftOrder.length } as React.CSSProperties}
              >
                <span className="vote-order-ring-center" aria-hidden="true">
                  <TokenIcon type="rotateRight" />
                </span>
                {renderedOrder.map((houseId, index) => (
                  <DraggableVoteOrderSeat
                    active={activeDragId === houseId}
                    disabled={busy || locked}
                    house={houseById.get(houseId)}
                    id={houseId}
                    index={index}
                    previewTarget={activeDragId === houseId && dragTargetIndex === index}
                    total={renderedOrder.length}
                    instructionsId="vote-order-keyboard-help"
                    onKeyboardMove={moveSeatByStep}
                    onKeyboardMoveTo={moveSeatToIndex}
                    key={houseId}
                  />
                ))}
              </div>
              <DragOverlay dropAnimation={null} modifiers={voteOrderDragOverlayModifiers}>
                {activeDragHouse ? (
                  <VoteOrderDragPreview
                    house={activeDragHouse}
                    index={Math.max(0, renderedOrder.indexOf(activeDragId))}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <p className="vote-order-warning">{ko.voteOrder.needLogin}</p>
          )}
          {saveStatus ? <p className="vote-order-status" role="status">{saveStatus}</p> : null}
          <div className="session-end-actions vote-order-actions">
            <button className="ghost-button" type="button" onClick={onClose} disabled={busy}>
              {ko.common.close}
            </button>
            <button className="primary-button" type="submit" disabled={!canSave}>
              <TokenIcon type="save" />
              {ko.common.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default VoteOrderDialog;
