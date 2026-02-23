// src/adminTools/logAdminAction.js
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Schrijft een beheerderhandeling naar de Firestore logs_admin collectie.
 *
 * @param {object} params
 * @param {string} params.type            - Soort handeling (bijv. "user_role_change")
 * @param {string} params.description     - Leesbare omschrijving
 * @param {string} [params.collectionName] - Getroffen Firestore collectie
 * @param {string} params.adminUid        - UID van de beheerder
 * @param {string} params.adminEmail      - E-mail van de beheerder
 */
export async function logAdminAction({
  type,
  description,
  collectionName,
  adminUid,
  adminEmail,
}) {
  try {
    await addDoc(collection(db, "logs_admin"), {
      type,
      description,
      collectionName: collectionName || null,
      adminUid,
      adminEmail,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Admin logging mislukt:", err.message);
  }
}
