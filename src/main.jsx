// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// 🔥 Firebase wordt hier al geïnitialiseerd
import "./firebase";

// 📄 Basisstijl (optioneel)
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <HashRouter>
        <App />
    </HashRouter>
);
