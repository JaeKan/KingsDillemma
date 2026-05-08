import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProviders } from "./app/AppProviders";
import "./styles.scss";

const rootElement = document.querySelector("#root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

const root = globalThis.__KINGS_DILEMMA_ROOT__ ?? createRoot(rootElement);
globalThis.__KINGS_DILEMMA_ROOT__ = root;

root.render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
