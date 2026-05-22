import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startUpdateChecker } from "./lib/app-updater";

createRoot(document.getElementById("root")!).render(<App />);

// Detecta novas versões publicadas e atualiza PWAs instalados automaticamente
startUpdateChecker();

