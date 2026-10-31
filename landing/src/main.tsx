import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@juspay/blend-design-system/style.css";
import "./styles/landing.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
