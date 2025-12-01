// src/components/Admin/ImportExport/IEPoints.jsx
import React, { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function IEPoints() {
  const [message, setMessage] = useState("");

  async function exportPoints() {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const csv = [
      ["id", "email", "points"],
      ...list.map((u) => [u.id, u.email, u.points || 0]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    download("points_export.csv", csv);
  }

  async function importPoints(e) {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.split("\n").slice(1);

    for (let line of rows) {
      if (!line.trim()) continue;

      const [id, email, points] = line.split(",");

      await updateDoc(doc(db, "users", id), {
        points: Number(points),
      });
    }

    setMessage("✅ Punten geüpdatet!");
  }

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = name;
    a.click();
  }

  return (
    <div>
      <h2>⭐ Punten import/export</h2>

      <button onClick={exportPoints} className="admin-btn">
        📤 Exporteer punten
      </button>

      <br /><br />

      <input type="file" accept=".csv" onChange={importPoints} />

      {message && <p>{message}</p>}
    </div>
  );
}
