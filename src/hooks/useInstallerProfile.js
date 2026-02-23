import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { sendProfileChangedEmail } from "../services/mailService";

/**
 * Manages installer profile state: loading, editing, and saving.
 * @param {object} user - Firebase Auth user object.
 */
export function useInstallerProfile(user) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [melding, setMelding] = useState("");
  const [form, setForm] = useState({
    installer_full_name: "",
    installer_company: "",
    installer_phone: "",
    installer_kvk: "",
    installer_address: "",
    date_of_birth: "",
  });

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data();

          // Build full name from firstName/lastName if installer_full_name is missing
          const fullNameFallback = [data.firstName, data.lastName].filter(Boolean).join(" ");

          // Build address from separate fields if installer_address is missing
          const addressFallback = [
            data.street,
            data.houseNumber,
            data.postalCode,
            data.city,
          ].filter(Boolean).join(", ");

          setForm({
            installer_full_name: data.installer_full_name || fullNameFallback || data.name || user.displayName || "",
            installer_company: data.installer_company || data.company_name || data.company || "",
            installer_phone: data.installer_phone || data.phoneNumber || "",
            installer_kvk: data.installer_kvk || data.kvk || "",
            installer_address: data.installer_address || addressFallback || "",
            date_of_birth: data.date_of_birth || data.birthDate || "",
          });
        } else {
          setForm((prev) => ({ ...prev, installer_full_name: user.displayName || "" }));
        }
      } catch (err) {
        console.error("Instellingen laden mislukt:", err);
        if (!cancelled) setMelding("Er ging iets mis bij het ophalen van je gegevens. Probeer het later opnieuw.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMelding("");
    setSaving(true);

    if (!form.installer_full_name.trim()) {
      setSaving(false);
      setMelding("Vul je volledige naam in.");
      return;
    }
    if (!form.installer_company.trim()) {
      setSaving(false);
      setMelding("Vul je bedrijfsnaam in.");
      return;
    }
    if (!form.installer_phone.trim()) {
      setSaving(false);
      setMelding("Vul je telefoonnummer in.");
      return;
    }
    if (!/^[0-9]{8}$/.test(form.installer_kvk)) {
      setSaving(false);
      setMelding("Het KVK-nummer moet uit 8 cijfers bestaan.");
      return;
    }
    if (!form.installer_address.trim()) {
      setSaving(false);
      setMelding("Vul je adres in.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        installer_full_name: form.installer_full_name,
        installer_company: form.installer_company,
        installer_phone: form.installer_phone,
        installer_kvk: form.installer_kvk,
        installer_address: form.installer_address,
        date_of_birth: form.date_of_birth || null,
        profile_completed: true,
        updatedAt: serverTimestamp(),
      });
      sendProfileChangedEmail(user.email, form.installer_full_name);
      setMelding("✅ Je gegevens zijn opgeslagen.");
    } catch (err) {
      console.error("Instellingen opslaan mislukt:", err);
      setMelding("Er ging iets mis bij het opslaan van je gegevens. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  return { loading, form, saving, melding, handleChange, handleSubmit };
}
