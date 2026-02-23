import { useEffect, useState } from "react";
import { auth, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

export default function AdminBootstrap() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("Wachten…");

  // Auth check (alleen voor info)
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);

      if (u) {
        await u.getIdTokenResult(true);
      }
    });

    return () => unsub();
  }, []);

  async function makeMeAdmin() {
    setStatus("⏳ setAdminClaim aanroepen…");

    try {
      const current = auth.currentUser;
      if (!current) {
        setStatus("❌ Niet ingelogd");
        return;
      }

      const fn = httpsCallable(functions, "setAdminClaim");

      await fn({
        uid: current.uid,
        admin: true,
      });

      await current.getIdToken(true);
      const token = await current.getIdTokenResult();

      if (token.claims.admin) {
        setStatus("✅ JE BENT NU ADMIN");
      } else {
        setStatus("⚠️ Claim niet zichtbaar");
      }
    } catch (err) {
      console.error("BOOTSTRAP ERROR:", err);
      setStatus(
        "❌ FOUT: " +
          (err?.code || "") +
          " " +
          (err?.message || "onbekend")
      );
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          padding: "40px",
          borderRadius: "12px",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ marginBottom: "20px" }}>
          🔐 Admin Bootstrap
        </h1>

        <p style={{ fontSize: "14px", color: "#aaa" }}>
          Tijdelijke pagina om jezelf admin te maken.
        </p>

        <hr style={{ margin: "20px 0" }} />

        <p>
          <strong>Ingelogd:</strong>{" "}
          {user ? "JA" : "NEE"}
        </p>
        <p>
          <strong>Email:</strong>{" "}
          {user?.email || "—"}
        </p>
        <p>
          <strong>UID:</strong>{" "}
          {user?.uid || "—"}
        </p>

        <button
          onClick={makeMeAdmin}
          style={{
            marginTop: "24px",
            padding: "16px",
            width: "100%",
            fontSize: "18px",
            fontWeight: "bold",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          🔐 MAAK MIJ ADMIN
        </button>

        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#000",
            borderRadius: "6px",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          STATUS: {status}
        </div>

        <p style={{ marginTop: "20px", fontSize: "12px", color: "#777" }}>
          Verwijder deze pagina na succesvol gebruik.
        </p>
      </div>
    </div>
  );
}
