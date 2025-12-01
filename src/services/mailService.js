import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Replace {{variables}} in templates
 */
function replaceVars(text, vars) {
  return text.replace(/\{\{(.*?)\}\}/g, (_, key) => vars[key.trim()] || "");
}

/**
 * Load template from Firestore
 */
async function getTemplate(id) {
  const ref = doc(db, "mailTemplates", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.error(`❌ Template ${id} niet gevonden`);
    return null;
  }

  return snap.data();
}

/**
 * Send email via Firebase Cloud Function (HTTP)
 */
export async function sendEmail(templateId, to, vars = {}) {
  const template = await getTemplate(templateId);

  if (!template) return false;

  const subject = replaceVars(template.subject, vars);
  const body = replaceVars(template.body, vars);

  const payload = {
    to,
    subject,
    html: body,
  };

  try {
    const res = await fetch("https://europe-west1-mijnfegon.cloudfunctions.net/sendMail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    console.log("📧 Mail verzonden:", templateId);
    return true;
  } catch (err) {
    console.error("❌ Fout bij versturen mail:", err);
    return false;
  }
}
