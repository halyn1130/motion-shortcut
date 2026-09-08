import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Overlay from "./Overlay.tsx";
import Keyboard from "./Keyboard.tsx";

const params = new URLSearchParams(window.location.search);
const isOverlay = params.has("overlay");
const isKeyboard = params.has("keyboard");
if (isOverlay) document.documentElement.classList.add("overlay-page");
if (isKeyboard) document.documentElement.classList.add("keyboard-page");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isKeyboard ? <Keyboard /> : isOverlay ? <Overlay /> : <App />}
  </StrictMode>,
);
