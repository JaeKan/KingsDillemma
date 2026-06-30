import assert from "node:assert/strict";
import { isAgendaWindowFocused } from "../src/app/agendaFocus";

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

function defineGlobal(name: "document" | "window", value: unknown) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value,
  });
}

function restoreGlobal(name: "document" | "window", descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }

  delete (globalThis as any)[name];
}

try {
  restoreGlobal("document", undefined);
  restoreGlobal("window", undefined);
  assert.equal(isAgendaWindowFocused(), true, "server-side callers should not be treated as backgrounded");

  defineGlobal("document", { visibilityState: "visible" });
  defineGlobal("window", { hasFocus: () => true });
  assert.equal(isAgendaWindowFocused(), true, "visible focused windows should be active");

  defineGlobal("document", { visibilityState: "visible" });
  defineGlobal("window", { hasFocus: () => false });
  assert.equal(isAgendaWindowFocused(), false, "visible windows without focus should be inactive");

  defineGlobal("document", { visibilityState: "hidden" });
  defineGlobal("window", { hasFocus: () => true });
  assert.equal(isAgendaWindowFocused(), false, "hidden documents should be inactive even if hasFocus is true");

  defineGlobal("document", { visibilityState: "visible" });
  defineGlobal("window", {});
  assert.equal(isAgendaWindowFocused(), true, "older browser-like windows without hasFocus should fall back to visible");
} finally {
  restoreGlobal("document", originalDocument);
  restoreGlobal("window", originalWindow);
}

console.log("agenda focus tests passed");
