// src/components/Admin/ImportExport/IEUsers.jsx
import React, { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function IEUsers() {
  const [message, setMessage] = useState("");

  async function exportUsers() {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const csv = [
      ["id", "email", "name", "company", "role", "points"],
      ...list.map((u) => [
        u.id,
        u.email || "",
        u.name || "",
        u.company || "",
        u.role || "user",
        u.points || 0,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    download("users_export.csv", csv);
  }

  async function importUsers(e) {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.split("\n").slice(1);

    for (let line of rows) {
      if (!line.trim()) continue;
      const [id, email, name, company, role, points] = line.split(",");

      await setDoc(
        doc(db, "users", id),
        {
          email,
          name,
          company,
          role,
          points: Number(points || 0),
        },
        { merge: true }
      );
    }

    setMessage("✅ Gebruikers succesvol geïmporteerd!");
  }

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = name;
    a.click();
  }

  return (
    <div>
      <h2>👥 Gebruikers import/export</h2>

      <button onClick={exportUsers} className="admin-btn">
        📤 Exporteer gebruikers
      </button>

      <br /><br />

      <input type="file" accept=".csv" onChange={importUsers} />

      {message && <p>{message}</p>}
    </div>
  );
}
