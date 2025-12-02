// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// 🔥 Firebase wordt hier al geïnitialiseerd
import "./firebase";

// 📄 Basisstijl (optioneel)
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/mijnfegon-standalone">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
