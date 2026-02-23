import emailjs from "@emailjs/browser";

// ─── EmailJS config ────────────────────────────────────────────────────────────
const SERVICE_ID = "service_jo37avf";
const PUBLIC_KEY = "etF4KjL0ggVy-8QsB";

// ─── Template IDs ──────────────────────────────────────────────────────────────
// Create these in https://dashboard.emailjs.com → Email Templates,
// then replace each placeholder with the generated template_xxxxx ID.
//
// All templates must have "To Email" field set to {{to_email}}
// unless noted otherwise.
const TEMPLATES = {
  // Email 4 — Bevestiging registratie waterontharder (after form submit)
  // Variables: to_email, installer_name, product_brand, product_model,
  //            product_serial, install_date, customer_name
  SUBMISSION: "template_yhh1q9v",

  // Email 5 — Eerste registratie gelukt (first registration only)
  // Variables: to_email, installer_name, product_brand, product_model,
  //            product_serial, install_date, customer_name, compenda_id, points
  FIRST_REG: "template_6uikpzw",

  // Email 6 — 50 punten verdiend, registratie goedgekeurd (subsequent registrations)
  // Variables: to_email, installer_name, product_brand, product_model,
  //            product_serial, install_date, customer_name, compenda_id, points
  APPROVED: "template_wpc7r3y",

  // Internal admin notification (on every approval)
  // Variables: to_email, installer_name, installer_company, installer_email,
  //            customer_name, customer_address, customer_email, customer_phone,
  //            product_brand, product_model, product_serial, install_date,
  //            compenda_id, points, processed_at
  ADMIN: "template_k4ntgd9",

  // Email 1 — Welkom op MijnFegon (after account creation)
  // Variables: to_email, installer_name
  WELCOME: "template_g3qdnvi",

  // Email 14 — Wijziging bedrijfsgegevens (after profile save)
  // Variables: to_email, installer_name
  PROFILE_CHANGED: "template_ygjyo0h",
};

const ADMIN_EMAIL = "gilmar.korts@fegon.nl";

// ─── Shared helpers ────────────────────────────────────────────────────────────
function customerName(reg) {
  return [reg.customer_first_name, reg.customer_middle_name, reg.customer_last_name]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" ") || "—";
}

async function send(templateId, params) {
  try {
    await emailjs.send(SERVICE_ID, templateId, params, PUBLIC_KEY);
    console.warn("📧 EmailJS verzonden →", params.to_email);
  } catch (err) {
    console.error("EmailJS fout:", err);
  }
}

// ─── Email 1: Welkom nieuw account ────────────────────────────────────────────
// Called from Register.jsx after createUserWithEmailAndPassword
export function sendWelcomeEmail(email, name) {
  send(TEMPLATES.WELCOME, {
    to_email: email,
    installer_name: name || "Installateur",
  });
}

// ─── Email 4 / 5 / 6 + admin: Registration emails ─────────────────────────────
// Email 4: sendSubmissionConfirmation — called from RegistratieFormulier.jsx
// Variables: to_email, installer_name, product_brand, product_model,
//            product_serial, install_date, customer_name
export function sendSubmissionConfirmation(reg) {
  send(TEMPLATES.SUBMISSION, {
    to_email:       reg.installer_email,
    installer_name: reg.installer_name || reg.installer_email || "Installateur",
    product_brand:  reg.product_brand  || "—",
    product_model:  reg.product_model  || "—",
    product_serial: reg.product_serial_number || "—",
    install_date:   reg.product_installation_date || "—",
    customer_name:  customerName(reg),
  });
}

// Email 5 / 6 + admin: sendApprovalEmails — called from AdminRegistraties.jsx
// isFirstRegistration=true → uses FIRST_REG template; false → uses APPROVED template
export async function sendApprovalEmails(reg, compendaId, points, isFirstRegistration = false) {
  const name    = customerName(reg);
  const address = [
    reg.customer_street,
    reg.customer_house_number,
    reg.customer_house_addition,
    reg.customer_postcode,
    reg.customer_city,
  ]
    .filter(Boolean)
    .join(" ");

  const now = new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" });
  const installerTemplate = isFirstRegistration ? TEMPLATES.FIRST_REG : TEMPLATES.APPROVED;

  await Promise.allSettled([
    send(installerTemplate, {
      to_email:       reg.installer_email,
      installer_name: reg.installer_name || reg.installer_email || "Installateur",
      product_brand:  reg.product_brand  || "—",
      product_model:  reg.product_model  || "—",
      product_serial: reg.product_serial_number || "—",
      install_date:   reg.product_installation_date || "—",
      customer_name:  name,
      compenda_id:    compendaId,
      points,
    }),

    send(TEMPLATES.ADMIN, {
      to_email:          ADMIN_EMAIL,
      installer_name:    reg.installer_name    || "—",
      installer_company: reg.installer_company || "—",
      installer_email:   reg.installer_email   || "—",
      customer_name:     name,
      customer_address:  address || "—",
      customer_email:    reg.customer_email        || "—",
      customer_phone:    reg.customer_mobile_phone || "—",
      product_brand:     reg.product_brand  || "—",
      product_model:     reg.product_model  || "—",
      product_serial:    reg.product_serial_number || "—",
      install_date:      reg.product_installation_date || "—",
      compenda_id:       compendaId,
      points,
      processed_at:      now,
    }),
  ]);
}

// ─── Email 14: Bedrijfsgegevens gewijzigd ─────────────────────────────────────
// Called from useInstallerProfile.js after successful profile save
export function sendProfileChangedEmail(email, name) {
  send(TEMPLATES.PROFILE_CHANGED, {
    to_email:       email,
    installer_name: name || "Installateur",
  });
}
