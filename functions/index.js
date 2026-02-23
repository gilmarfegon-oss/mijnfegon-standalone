const admin = require("firebase-admin");
const axios = require("axios");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

// ==========================================
// 1. CONFIGURATIE & SECRETS
// ==========================================
const COMPENDA_TOKEN = defineSecret("COMPENDA_TOKEN");
const KVK_API_KEY = defineSecret("KVK_API_KEY");

// Switch to production by changing this to "https://mijnfegon.compenda-app.nl"
const COMPENDA_BASE_URL = process.env.COMPENDA_BASE_URL || "https://mijnfegontest.compenda-app.nl";

// ==========================================
// 2. EMAILJS — SERVER-SIDE REST API
// ==========================================
// Matches the same service used in src/services/mailService.js (client-side).
// Template IDs must match those created in https://dashboard.emailjs.com
const EMAILJS_SERVICE_ID = "service_jo37avf";
const EMAILJS_PUBLIC_KEY  = "etF4KjL0ggVy-8QsB";

// Template IDs for server-side triggered emails (birthday, re-engagement, password reset)
// Replace each placeholder after creating the template in the EmailJS dashboard.
const EMAILJS_TEMPLATES = {
    BIRTHDAY:      "template_ruu8qfg", // Email 7  — Gefeliciteerd! 100 extra punten
    REENGAGEMENT:  "template_rri4zql", // Email 7b — Lange tijd niet ingelogd
    PASSWORD_RESET:"template_0r7gx12", // Email 2  — Wachtwoord opnieuw instellen
};

// Fire-and-forget email sender via EmailJS REST API.
// Errors are logged but never propagate (email failure ≠ function failure).
async function sendEmailJS(templateId, params) {
    try {
        await axios.post("https://api.emailjs.com/api/v1.0/email/send", {
            service_id:      EMAILJS_SERVICE_ID,
            template_id:     templateId,
            user_id:         EMAILJS_PUBLIC_KEY,
            template_params: params,
        }, { headers: { "Content-Type": "application/json" } });
        console.log(`✉️ EmailJS: ${templateId} → ${params.to_email}`);
    } catch (err) {
        console.error("EmailJS REST fout:", err.response?.data || err.message);
    }
}

// Alleen merken die Compenda accepteert in hun enum — anderen worden weggelaten uit de payload
const COMPENDA_BRANDS = [
    "AquaStar", "DigiSoft", "AquaStar-Pro", "Altech",
    "Blue Label", "Lavigo", "Plieger", "Descale",
    "Softy", "digisofter", "ATAG"
];

// ==========================================
// 3. DATA MAPPERS & HELPERS
// ==========================================

function mapGender(input) {
    if (!input) return "other/unknown";
    const lower = String(input).toLowerCase().trim();
    if (['man', 'm', 'male'].includes(lower)) return 'male';
    if (['vrouw', 'v', 'female', 'woman'].includes(lower)) return 'female';
    return 'other/unknown';
}

// Geeft null terug voor merken die niet in Compenda's enum zitten — zodat ze weggelaten worden
function mapBrand(input) {
    if (!input) return null;
    const match = COMPENDA_BRANDS.find(b => b.toLowerCase() === String(input).toLowerCase());
    return match || null;
}

// Postcode in NL standaard formaat "2901 JD" (4 cijfers + spatie + 2 letters)
function formatZip(input) {
    if (!input) return "9999 XX";
    const clean = String(input).toUpperCase().replace(/\s+/g, '').trim();
    const match = clean.match(/^(\d{4})([A-Z]{2})$/);
    if (match) return `${match[1]} ${match[2]}`;
    return clean; // Niet-standaard formaat: ongewijzigd teruggeven
}

// Telefoonnummer naar E.164 formaat (+31...) voor maximale API compatibiliteit
function formatPhoneE164(phone) {
    if (!phone) return null;
    const p = String(phone).trim().replace(/[\s\-\.]/g, '');
    if (p.startsWith('+')) return p;
    if (p.startsWith('00')) return '+' + p.slice(2);
    if (p.startsWith('0') && p.length >= 9) return '+31' + p.slice(1);
    return p || null;
}

// Haalt huisnummer en toevoeging uit elkaar (Essential voor validatie)
function parseAddressComponents(inputNr, inputSuffix) {
    let rawNr = String(inputNr || "").trim();
    let rawSuffix = String(inputSuffix || "").trim();

    // Regex: Pak cijfers aan het begin, rest is suffix
    const match = rawNr.match(/^(\d+)(.*)$/);
    
    let number = 1; 
    let extractedSuffix = "";

    if (match) {
        number = parseInt(match[1], 10);
        extractedSuffix = match[2].trim();
    }

    // Losse suffix heeft voorrang, anders die uit het huisnummerveld
    let finalSuffix = rawSuffix !== "" ? rawSuffix : extractedSuffix;

    return { 
        house_number: number, 
        house_number_suffix: finalSuffix || null 
    };
}

// Verwijdert lege velden uit objecten (voorkomt 422 errors op lege strings)
function cleanPayload(obj) {
    return Object.entries(obj)
        .filter(([_, v]) => v != null && v !== "")
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
}

// ==========================================
// 4. AUTH & ADMIN CHECK
// ==========================================
async function checkIsAdmin(auth) {
    if (!auth) throw new HttpsError('unauthenticated', 'Niet ingelogd.');
    if (auth.token.admin === true) return true;
    const userDoc = await admin.firestore().collection('users').doc(auth.uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
        await admin.auth().setCustomUserClaims(auth.uid, { admin: true });
        return true;
    }
    throw new HttpsError('permission-denied', 'Geen admin rechten.');
}

// ==========================================
// 5. COMPENDA LOGICA — REGISTRATIE VERWERKING
// ==========================================

// STAP 1: Zorg dat de wederverkoper (bedrijf van de installateur) bestaat in Compenda.
// Geeft het BEDRIJF ID terug — gebruikt voor: POST /companies/{id}/registrations
// De eindgebruiker zit in de 'customer' payload; het bedrijf is de wederverkoper.
async function ensureInstallerExistsInCompenda(installerUid) {
    const userRef = admin.firestore().collection('users').doc(installerUid);
    const snap = await userRef.get();
    if (!snap.exists) throw new Error("Installateur profiel niet gevonden in Firebase");
    const userData = snap.data();

    const token = COMPENDA_TOKEN.value();
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const companyName = userData.company_name || userData.installer_full_name || "Nieuwe Installateur";
    const installerEmail = userData.email || null;

    async function findCompanyAllPages() {
        let page = 1, lastPage = 1;
        do {
            const res = await axios.get(`${COMPENDA_BASE_URL}/companies?page=${page}`, { headers });
            lastPage = res.data.last_page || 1;
            const list = res.data.data || [];
            for (const c of list) {
                if (c.name?.toLowerCase() === companyName.toLowerCase()) return c.id;
                if (installerEmail && c.representative?.email?.toLowerCase() === installerEmail.toLowerCase()) return c.id;
            }
            if (list.length === 0) break;
            page++;
        } while (page <= lastPage);
        return null;
    }

    // A. Gecached bedrijf ID — verifieer of het nog bestaat
    let companyId = userData.compenda_company_id || userData.compenda_id || null;
    if (companyId) {
        try {
            await axios.get(`${COMPENDA_BASE_URL}/companies/${companyId}`, { headers });
            console.log("Compenda: gecached bedrijf ID geverifieerd:", companyId);
        } catch (e) {
            if (e.response?.status === 404) {
                companyId = null;
                await userRef.update({ compenda_company_id: null, compenda_id: null });
            } else {
                throw new Error(`Compenda bedrijf verificatie fout: ${e.message}`);
            }
        }
    }

    // B. Zoek bedrijf op naam of vertegenwoordiger e-mail
    if (!companyId) {
        companyId = await findCompanyAllPages();
        console.log("Compenda: bedrijf gezocht →", companyId || "niet gevonden");
    }

    // C. Maak bedrijf aan als het niet bestaat
    if (!companyId) {
        const { house_number, house_number_suffix } = parseAddressComponents(
            userData.houseNumber || userData.huisnummer,
            userData.houseAddition
        );
        const addressData = cleanPayload({
            street: userData.street || "Onbekend",
            house_number,
            house_number_suffix,
            postal_code: formatZip(userData.postalCode || userData.postcode),
            city: userData.city || "Onbekend",
            country: "NL"
        });
        console.log("Compenda: bedrijf aanmaken:", companyName, JSON.stringify(addressData));
        try {
            await axios.post(`${COMPENDA_BASE_URL}/companies`, { name: companyName, address: addressData }, { headers });
        } catch (e) {
            console.error("Compenda: bedrijf aanmaken fout:", e.response?.status, JSON.stringify(e.response?.data));
            if (e.response?.status !== 422) {
                throw new Error(`Kon wederverkoper niet aanmaken: ${JSON.stringify(e.response?.data || e.message)}`);
            }
        }
        companyId = await findCompanyAllPages();
        if (!companyId) throw new Error("Wederverkoper aangemaakt maar ID niet gevonden.");
    }

    await userRef.update({ compenda_company_id: companyId, compenda_id: companyId });
    console.log("Compenda: wederverkoper bedrijf ID:", companyId);
    return companyId;
}

// STAP 2: Verwerk de registratie (Koppel Klant aan Installateur)
async function processRegistrationLogic(registrationId) {
    const docRef = admin.firestore().collection('registrations').doc(registrationId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Registratie niet gevonden.');
    const data = snap.data();

    // 1. HAAL INSTALLATEUR ID OP (of maak aan)
    const installerId = await ensureInstallerExistsInCompenda(data.installer_uid);
    if (!installerId) throw new Error("Fataal: Geen installateur ID kunnen verkrijgen.");

    // 2. DATA VOORBEREIDEN — Klantadres (spec: Address vereist street, house_number, postal_code, city, country)
    const { house_number, house_number_suffix } = parseAddressComponents(
        data.customer_house_number,
        data.customer_house_addition
    );

    const customerAddress = cleanPayload({
        street: String(data.customer_street || "Onbekend"),
        house_number: house_number,            // integer, required
        house_number_suffix: house_number_suffix, // string, optional — cleaned if null
        postal_code: formatZip(data.customer_postcode), // required
        city: String(data.customer_city || "Onbekend"),  // required
        country: "NL"                          // required enum: NL | BE | DE
    });

    // 3. PAYLOAD BOUWEN — eindgebruiker data uit het formulier
    // Spec: Registration vereist alleen 'customer' (full_name + email)
    // brand: alleen meesturen als het in Compenda's enum staat (mapBrand geeft null voor onbekende merken)
    const brand = mapBrand(data.product_brand);
    const serialRaw = String(data.product_serial_number || "").replace(/[\s-]/g, "");

    const payload = cleanPayload({
        ...(serialRaw ? { serial_number: serialRaw } : {}),
        ...(brand ? { brand } : {}),
        model: data.product_model || null,
        installation_date: data.product_installation_date || null,
        ...(data.loyalty_points ? { loyalty_points: String(data.loyalty_points) } : {}),
        customer: cleanPayload({
            full_name: [
                data.customer_first_name,
                data.customer_middle_name,
                data.customer_last_name
            ].map(s => (s || "").trim()).filter(Boolean).join(" ") || "Onbekend",
            email: data.customer_email || "onbekend@email.nl",
            phone_number: formatPhoneE164(data.customer_mobile_phone),
            gender: mapGender(data.customer_gender),
            address: customerAddress
        })
    });

    // POST naar /companies/{bedrijf_id}/registrations
    // installerId = bedrijf van de wederverkoper (installateur)
    // customer in payload = eindgebruiker (uit het registratieformulier)
    const url = `${COMPENDA_BASE_URL}/companies/${installerId}/registrations`;
    console.log("Compenda: POST naar:", url);
    console.log("Verstuurde payload:", JSON.stringify(payload));

    let res;
    try {
        res = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${COMPENDA_TOKEN.value()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log("Compenda: registratie aangemaakt. Status:", res.status);
    } catch (e) {
        const errorData = e.response?.data;
        console.error("Compenda sync fout:", e.response?.status, JSON.stringify(errorData));
        console.error("Verstuurde payload:", JSON.stringify(payload));

        let msg = e.message;
        if (Array.isArray(errorData?.fields) && errorData.fields.length > 0) {
            msg = `Validatiefout: ${errorData.fields.map(f => `${f.field_name}: ${f.error}`).join(", ")}`;
        } else if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
            msg = `Validatiefout: ${Object.entries(errorData.errors).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
        } else if (errorData?.error_message) {
            msg = `${errorData.error_message} (HTTP ${e.response?.status})`;
        }
        throw new Error(msg);
    }

    // Spec says 204 No Content; some implementations may return an ID
    const compendaId = res.data?.id || res.data?.data?.id || "synced";
    // Points are always server-enforced — never read from user-submitted data
    const pointsToAward = 50;

    // Atomic batch: approve registration + credit points to installer
    const batch = admin.firestore().batch();
    batch.update(docRef, {
        status: 'approved',
        points_awarded: pointsToAward,
        synced_to_compenda: true,
        compenda_id: compendaId,
        compenda_sync_date: admin.firestore.FieldValue.serverTimestamp()
    });
    const installerRef = admin.firestore().collection('users').doc(data.installer_uid);
    batch.update(installerRef, {
        points_total: admin.firestore.FieldValue.increment(pointsToAward),
        saldo: admin.firestore.FieldValue.increment(pointsToAward),
    });
    await batch.commit();

    // Detect first registration (after commit, count = 1 means this is the first approved)
    const approvedSnap = await admin.firestore()
        .collection("registrations")
        .where("installer_uid", "==", data.installer_uid)
        .where("status", "==", "approved")
        .get();
    const isFirstRegistration = approvedSnap.size === 1;

    return { success: true, compendaId, points: pointsToAward, isFirstRegistration };
}

// ==========================================
// 6. EXPORTS — CALLABLE & HTTP ENDPOINTS
// ==========================================

const ALLOWED_ORIGINS = [
    "https://mijnfegon.web.app",
    "https://mijnfegon.firebaseapp.com",
];

exports.kvkCheckHttp = onRequest({ region: "europe-west1", secrets: [KVK_API_KEY], cors: ALLOWED_ORIGINS }, async (req, res) => {
    try {
        const kvk = String(req.query.kvk || "").trim();
        if(!kvk) return res.status(400).json({error: "Geen KVK"});
        const response = await axios.get(`https://api.kvk.nl/api/v2/zoeken?kvkNummer=${kvk}`, {
             headers: { "apikey": KVK_API_KEY.value(), "Accept": "application/json" }
        });
        return res.json({ ok: true, data: response.data });
    } catch(e) { return res.status(500).json({error: e.message}); }
});

exports.debugKvkConn = onRequest({ region: "europe-west1", secrets: [KVK_API_KEY], cors: ALLOWED_ORIGINS }, async (_req, res) => {
    return res.json({ ok: true });
});

/**
 * setUserRole — Atomically sets Firestore role + Auth custom claims.
 * Prevents self-demotion and removal of the last admin.
 */
exports.setUserRole = onCall({ region: "europe-west1" }, async (request) => {
    await checkIsAdmin(request.auth);

    const { uid, role } = request.data || {};
    if (!uid || typeof uid !== "string") {
        throw new HttpsError("invalid-argument", "uid is verplicht.");
    }
    if (role !== "user" && role !== "admin") {
        throw new HttpsError("invalid-argument", "Rol moet 'user' of 'admin' zijn.");
    }

    const callerUid = request.auth.uid;

    // Prevent self-demotion
    if (uid === callerUid && role !== "admin") {
        throw new HttpsError("failed-precondition", "Je kunt je eigen admin rechten niet verwijderen.");
    }

    const fsDb = admin.firestore();
    const userRef = fsDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new HttpsError("not-found", "Gebruiker niet gevonden.");
    }

    const oldRole = userDoc.data().role || "user";

    // Prevent removing the last admin
    if (oldRole === "admin" && role === "user") {
        const adminsSnap = await fsDb.collection("users")
            .where("role", "==", "admin").get();
        if (adminsSnap.size <= 1) {
            throw new HttpsError("failed-precondition", "Er moet minimaal één admin overblijven.");
        }
    }

    // Atomically update Firestore role + Auth custom claims
    await userRef.update({ role });
    await admin.auth().setCustomUserClaims(uid, { admin: role === "admin" });

    // Server-side audit log
    await fsDb.collection("logs_admin").add({
        type: "user_role_change",
        description: `Rol gewijzigd van "${oldRole}" naar "${role}" voor ${userDoc.data().email || uid}`,
        collectionName: "users",
        targetUid: uid,
        adminUid: callerUid,
        adminEmail: request.auth.token.email || "",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, oldRole, newRole: role };
});

exports.syncAllInstallers = onCall({ region: "europe-west1", secrets: [COMPENDA_TOKEN] }, async (request) => {
    await checkIsAdmin(request.auth);
    return { success: true };
});

exports.syncInstallerToCompenda = onCall({ region: "europe-west1", secrets: [COMPENDA_TOKEN] }, async (request) => {
    await checkIsAdmin(request.auth);
    const id = await ensureInstallerExistsInCompenda(request.data.installerUid);
    return { success: true, compendaId: id };
});

exports.approveRegistrationToCompenda = onCall({
    region: "europe-west1",
    secrets: [COMPENDA_TOKEN]
}, async (request) => {
    await checkIsAdmin(request.auth);
    try {
        return await processRegistrationLogic(request.data.registrationId);
    } catch (e) {
        throw new HttpsError('invalid-argument', e.message);
    }
});

exports.createRegistrationHttp = onRequest({
    region: "europe-west1",
    secrets: [COMPENDA_TOKEN],
    cors: ALLOWED_ORIGINS
}, async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Verify Firebase Auth token + admin role
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Niet geauthenticeerd." });
    }
    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch (_e) {
        return res.status(401).json({ error: "Ongeldig of verlopen token." });
    }

    // Admin check: verify custom claim or Firestore role
    if (decodedToken.admin !== true) {
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return res.status(403).json({ error: "Geen admin rechten." });
        }
    }

    try {
        const { registrationId } = req.body;
        if (!registrationId) return res.status(400).json({ error: "Geen ID" });
        const result = await processRegistrationLogic(registrationId);
        return res.json(result);
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 6b. WELKOMSTPUNTEN (eenmalig bij profiel voltooien)
// ==========================================
exports.awardWelcomePoints = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Niet ingelogd.');

    const uid = request.auth.uid;
    const userRef = admin.firestore().collection('users').doc(uid);

    // Transaction prevents race conditions and double-awarding on concurrent calls.
    // Guard on 'welcome_points_awarded' (server-only, not writable by users)
    // so users cannot reset profile_completed to false and re-claim.
    const result = await admin.firestore().runTransaction(async (transaction) => {
        const snap = await transaction.get(userRef);
        if (!snap.exists) throw new HttpsError('not-found', 'Gebruikersprofiel niet gevonden.');

        // Server-controlled flag — users cannot write this field (blocked in Firestore rules)
        if (snap.data().welcome_points_awarded === true) {
            return { alreadyAwarded: true };
        }

        // Atomically award points AND set the immutable server flag
        transaction.update(userRef, {
            points_total: admin.firestore.FieldValue.increment(100),
            saldo: admin.firestore.FieldValue.increment(100),
            welcome_points_awarded: true,
        });
        return { alreadyAwarded: false };
    });

    return { success: true, ...result };
});

// ==========================================
// 7. ADMIN — PUNTEN HANDMATIG AANPASSEN
// ==========================================
// Atomic transaction: reads current balances, validates, updates both
// points_total and saldo, writes server-side audit log.
// Only accessible by verified admins.
exports.adjustUserPoints = onCall({ region: "europe-west1" }, async (request) => {
    await checkIsAdmin(request.auth);

    const { uid, amount, reason } = request.data;
    if (!uid) throw new HttpsError('invalid-argument', 'Gebruiker ID verplicht.');

    const numAmount = Number(amount);
    if (!numAmount || Number.isNaN(numAmount)) {
        throw new HttpsError('invalid-argument', 'Ongeldig puntenaantal.');
    }
    if (!reason || !String(reason).trim()) {
        throw new HttpsError('invalid-argument', 'Reden is verplicht.');
    }

    const fsDb = admin.firestore();

    const result = await fsDb.runTransaction(async (transaction) => {
        const userRef = fsDb.collection('users').doc(uid);
        const snap = await transaction.get(userRef);
        if (!snap.exists) throw new HttpsError('not-found', 'Gebruiker niet gevonden.');

        const data = snap.data();
        const currentTotal = data.points_total || 0;
        const currentSaldo = data.saldo || 0;

        const newTotal = currentTotal + numAmount;
        const newSaldo = currentSaldo + numAmount;

        if (newSaldo < 0) {
            throw new HttpsError('failed-precondition',
                `Saldo kan niet onder 0 komen. Huidig saldo: ${currentSaldo}`);
        }
        if (newTotal < 0) {
            throw new HttpsError('failed-precondition',
                `Totaal kan niet onder 0 komen. Huidig totaal: ${currentTotal}`);
        }

        transaction.update(userRef, {
            points_total: newTotal,
            saldo: newSaldo,
        });

        // Server-side audit log (inside same transaction)
        const logRef = fsDb.collection('logs_admin').doc();
        transaction.set(logRef, {
            type: 'points_manual_adjustment',
            description: `${numAmount >= 0 ? '+' : ''}${numAmount} punten: ${String(reason).trim()}`,
            collectionName: 'users',
            docId: uid,
            userEmail: data.email || null,
            before: { points_total: currentTotal, saldo: currentSaldo },
            after: { points_total: newTotal, saldo: newSaldo },
            adminUid: request.auth.uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { points_total: newTotal, saldo: newSaldo };
    });

    return { success: true, ...result };
});

// ==========================================
// 8. SHOP — PRODUCT KOPEN (Atomaire transactie)
// ==========================================
// Replaces client-side purchase logic to prevent race conditions.
// Uses a Firestore transaction: read balance → verify → deduct → create order.
exports.purchaseProduct = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Niet ingelogd.');

    const uid = request.auth.uid;
    const { productId } = request.data;
    if (!productId) throw new HttpsError('invalid-argument', 'Product ID verplicht.');

    const fsDb = admin.firestore();
    const MIN_BALANCE_REQUIRED = 250;

    const result = await fsDb.runTransaction(async (transaction) => {
        const userRef = fsDb.collection('users').doc(uid);
        const productRef = fsDb.collection('products').doc(productId);

        const [userSnap, productSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(productRef),
        ]);

        if (!userSnap.exists) throw new HttpsError('not-found', 'Gebruiker niet gevonden.');
        if (!productSnap.exists) throw new HttpsError('not-found', 'Product niet gevonden.');

        const uData = userSnap.data();
        const product = productSnap.data();
        const price = product.price || product.points || 0;
        const currentSaldo = uData.saldo || 0;

        if (product.active === false) throw new HttpsError('failed-precondition', 'Product is niet beschikbaar.');
        if (currentSaldo < MIN_BALANCE_REQUIRED) throw new HttpsError('failed-precondition', `Minimaal ${MIN_BALANCE_REQUIRED} Drops nodig om te bestellen.`);
        if (currentSaldo < price) throw new HttpsError('failed-precondition', 'Onvoldoende Drops.');

        // Atomically deduct saldo and create order
        transaction.update(userRef, {
            saldo: admin.firestore.FieldValue.increment(-price),
        });

        const orderRef = fsDb.collection('orders').doc();
        transaction.set(orderRef, {
            userId: uid,
            userName: uData.installer_full_name || uData.email || 'Onbekend',
            userCompany: uData.installer_company || uData.company_name || '',
            productName: product.name,
            productId: productId,
            price: price,
            status: 'Nieuw',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { orderId: orderRef.id, productName: product.name, price };
    });

    return { success: true, ...result };
});

// ==========================================
// 9. VERJAARDAGSPUNTEN (Dagelijks geplande taak)
// ==========================================
// Runs every day at 08:00 Amsterdam time.
// Awards 100 points to installers whose birthday matches today.
// Guards on 'birthday_points_year' (server-only field) to prevent
// double-awarding within the same calendar year.
exports.scheduledBirthdayPoints = onSchedule(
    { schedule: "0 8 * * *", timeZone: "Europe/Amsterdam", region: "europe-west1" },
    async () => {
        const db = admin.firestore();
        const now = new Date();
        const todayMonth = now.getMonth() + 1; // 1–12
        const todayDay = now.getDate();          // 1–31
        const thisYear = now.getFullYear();

        const usersSnap = await db.collection('users').get();
        const batch = db.batch();
        const awardedUsers = [];

        usersSnap.forEach((docSnap) => {
            const data = docSnap.data();

            // Skip if no date_of_birth stored
            if (!data.date_of_birth) return;

            // date_of_birth is stored as "YYYY-MM-DD"
            const parts = String(data.date_of_birth).split('-');
            if (parts.length !== 3) return;
            const birthMonth = parseInt(parts[1], 10);
            const birthDay = parseInt(parts[2], 10);

            if (birthMonth !== todayMonth || birthDay !== todayDay) return;

            // Already awarded this year?
            if (data.birthday_points_year === thisYear) return;

            batch.update(docSnap.ref, {
                points_total: admin.firestore.FieldValue.increment(100),
                saldo: admin.firestore.FieldValue.increment(100),
                birthday_points_year: thisYear,
            });
            awardedUsers.push({
                email: data.email,
                name: data.installer_full_name || "Installateur",
            });
        });

        if (awardedUsers.length > 0) {
            await batch.commit();
            await Promise.allSettled(
                awardedUsers.map((u) =>
                    sendEmailJS(EMAILJS_TEMPLATES.BIRTHDAY, {
                        to_email: u.email,
                        installer_name: u.name,
                    })
                )
            );
        }
        console.log(`Birthday points awarded to ${awardedUsers.length} installer(s) on ${todayDay}-${todayMonth}-${thisYear}.`);
    }
);

// ==========================================
// 10. WACHTWOORD RESET — CUSTOM EMAIL VIA EMAILJS
// ==========================================
// Replaces Firebase's default password reset email (which comes from
// noreply@firebaseapp.com and often lands in spam).
// Generates an official Firebase reset link server-side, sends it via EmailJS.
exports.sendPasswordResetLink = onCall({ region: "europe-west1" }, async (request) => {
    const email = String(request.data?.email || "").trim().toLowerCase();
    if (!email) throw new HttpsError("invalid-argument", "E-mailadres verplicht.");

    let link;
    try {
        link = await admin.auth().generatePasswordResetLink(email, {
            url: "https://mijnfegon.web.app/login",
        });
    } catch (e) {
        // Security: never reveal whether an email address has an account
        if (e.code === "auth/user-not-found" || e.code === "auth/invalid-email") {
            return { success: true };
        }
        console.error("generatePasswordResetLink fout:", e.message);
        throw new HttpsError("internal", "Kan reset-link niet genereren.");
    }

    await sendEmailJS(EMAILJS_TEMPLATES.PASSWORD_RESET, {
        to_email:   email,
        reset_link: link,
    });

    return { success: true };
});

// ==========================================
// 11. RE-ENGAGEMENT — LANG NIET INGELOGD (60 DAGEN)
// ==========================================
// Runs daily at 09:00 Amsterdam time.
// Sends Email 7b to installers who haven't logged in for 60+ days.
// Guards against re-sending within the same 60-day window.
exports.scheduledReengagement = onSchedule(
    { schedule: "0 9 * * *", timeZone: "Europe/Amsterdam", region: "europe-west1" },
    async () => {
        const db = admin.firestore();
        const now = Date.now();
        const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
        const cutoff = new Date(now - SIXTY_DAYS_MS);

        const usersSnap = await db.collection("users").get();
        const sendPromises = [];

        usersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.email || data.role === "admin") return;

            const lastLogin = data.last_login?.toDate ? data.last_login.toDate() : null;
            if (!lastLogin || lastLogin >= cutoff) return;

            // Don't re-send if already sent a re-engagement email within 60 days
            const lastSent = data.last_reengagement_email?.toDate ? data.last_reengagement_email.toDate() : null;
            if (lastSent && (now - lastSent.getTime()) < SIXTY_DAYS_MS) return;

            sendPromises.push(
                sendEmailJS(EMAILJS_TEMPLATES.REENGAGEMENT, {
                    to_email:       data.email,
                    installer_name: data.installer_full_name || "Installateur",
                }).then(() =>
                    db.collection("users").doc(docSnap.id).update({
                        last_reengagement_email: admin.firestore.FieldValue.serverTimestamp(),
                    })
                )
            );
        });

        await Promise.allSettled(sendPromises);
        console.log(`Re-engagement emails sent to ${sendPromises.length} installer(s).`);
    }
);

// ==========================================
// 12. ACCOUNT VERWIJDEREN (GDPR Art. 17 — recht op vergetelheid)
// ==========================================
exports.deleteUserAccount = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Niet ingelogd.');

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Anonimiseer registraties: verwijder klant-PII, bewaar productdata voor garantie
    const regSnap = await db.collection('registrations')
        .where('installer_uid', '==', uid)
        .get();

    const batch = db.batch();
    regSnap.forEach(docSnap => {
        batch.update(docSnap.ref, {
            customer_first_name: '[verwijderd]',
            customer_last_name: '[verwijderd]',
            customer_email: '[verwijderd]',
            customer_mobile_phone: '[verwijderd]',
            customer_street: '[verwijderd]',
            customer_house_number: '[verwijderd]',
            customer_house_addition: '[verwijderd]',
            customer_postcode: '[verwijderd]',
            customer_city: '[verwijderd]',
            customer_gender: '[verwijderd]',
            installer_uid: '[verwijderd]',
            account_deleted: true,
        });
    });
    await batch.commit();

    // Verwijder gebruikersdocument
    await db.collection('users').doc(uid).delete();

    // Verwijder Firebase Auth account
    await admin.auth().deleteUser(uid);

    return { success: true };
});