/// <reference types="vite/client" />

import type { Root } from "react-dom/client";

declare module "*.scss" {
  const content: { [className: string]: string };
  export default content;
}

declare global {
  var __KINGS_DILEMMA_ROOT__: Root | undefined;
}

export {};
