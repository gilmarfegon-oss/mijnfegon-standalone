// src/components/Admin/ImportExport/IERegistrations.jsx
import React, { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function IERegistrations() {
  const [message, setMessage] = useState("");

  async function exportRegistrations() {
    const snap = await getDocs(collection(db, "registrations"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const csv = [
      ["id", "serial", "installer_email", "installer_uid", "status"],
      ...list.map((r) => [
        r.id,
        r.serial || "",
        r.installer_email || "",
        r.installer_uid || "",
        r.status || "pending",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    download("registrations_export.csv", csv);
  }

  async function importRegistrations(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.split("\n").slice(1);

    for (let line of rows) {
      if (!line.trim()) continue;

      const [id, serial, email, uid, status] = line.split(",");

      await setDoc(
        doc(db, "registrations", id),
        {
          serial,
          installer_email: email,
          installer_uid: uid || null,
          status: status || "pending",
        },
        { merge: true }
      );
    }

    setMessage("✅ Registraties geïmporteerd!");
  }

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = name;
    a.click();
  }

  return (
    <div>
      <h2>📄 Registraties import/export</h2>

      <button onClick={exportRegistrations} className="admin-btn">
        📤 Exporteer registraties
      </button>

      <br /><br />

      <input type="file" accept=".csv" onChange={importRegistrations} />

      {message && <p>{message}</p>}
    </div>
  );
}
