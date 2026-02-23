// src/main.jsx
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// 🔥 Firebase wordt hier al geïnitialiseerd
import "./firebase";

// 📄 Basisstijl (optioneel)
import "./index.css";
import "./styles/layout.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
