# MijnFegon - Volledige Documentatie

> **Versie:** 1.0
> **Datum:** 23 februari 2026
> **Applicatie:** MijnFegon Installateurportaal
> **URL:** https://mijnfegon.web.app

---

## Inhoudsopgave

1. [Overzicht](#1-overzicht)
2. [Technische Stack](#2-technische-stack)
3. [Projectstructuur](#3-projectstructuur)
4. [Applicatiearchitectuur](#4-applicatiearchitectuur)
5. [Authenticatie & Autorisatie](#5-authenticatie--autorisatie)
6. [Routering](#6-routering)
7. [Gebruikersfuncties](#7-gebruikersfuncties)
   - 7.1 [Registreren](#71-registreren)
   - 7.2 [Inloggen](#72-inloggen)
   - 7.3 [Profiel Aanvullen](#73-profiel-aanvullen)
   - 7.4 [Dashboard](#74-dashboard)
   - 7.5 [Product Registratie](#75-product-registratie)
   - 7.6 [Mijn Registraties](#76-mijn-registraties)
   - 7.7 [Shop](#77-shop)
   - 7.8 [Mijn Bestellingen](#78-mijn-bestellingen)
   - 7.9 [Instellingen](#79-instellingen)
8. [Beheerdersfuncties (Admin)](#8-beheerdersfuncties-admin)
   - 8.1 [Admin Dashboard](#81-admin-dashboard)
   - 8.2 [Gebruikersbeheer](#82-gebruikersbeheer)
   - 8.3 [Installateurs (Compenda Sync)](#83-installateurs-compenda-sync)
   - 8.4 [Registratiebeheer](#84-registratiebeheer)
   - 8.5 [Productenbeheer](#85-productenbeheer)
   - 8.6 [Bestellingenbeheer](#86-bestellingenbeheer)
   - 8.7 [Puntenbeheer](#87-puntenbeheer)
   - 8.8 [Registraties Koppelen](#88-registraties-koppelen)
   - 8.9 [Import/Export](#89-importexport)
   - 8.10 [Logboek](#810-logboek)
   - 8.11 [Admin Instellingen](#811-admin-instellingen)
9. [Puntensysteem (Drops)](#9-puntensysteem-drops)
10. [Firebase Structuur](#10-firebase-structuur)
    - 10.1 [Firestore Collecties](#101-firestore-collecties)
    - 10.2 [Beveiligingsregels](#102-beveiligingsregels)
11. [Cloud Functions](#11-cloud-functions)
12. [Externe Koppelingen](#12-externe-koppelingen)
    - 12.1 [Compenda API](#121-compenda-api)
    - 12.2 [KVK API](#122-kvk-api)
    - 12.3 [PDOK Adresservice](#123-pdok-adresservice)
    - 12.4 [EmailJS](#124-emailjs)
13. [E-mailsysteem](#13-e-mailsysteem)
14. [Styling & Thema](#14-styling--thema)
15. [Privacy & AVG/GDPR](#15-privacy--avggdpr)
16. [Deployment & Hosting](#16-deployment--hosting)
17. [Ontwikkelomgeving](#17-ontwikkelomgeving)

---

## 1. Overzicht

**MijnFegon** is een B2B-webapplicatie (installateurportaal) ontwikkeld voor Fegon Nederland. De applicatie stelt installateurs in staat om:

- Productregistraties in te dienen voor waterbehandelingsproducten
- Punten (genaamd **Drops**) te verdienen voor goedgekeurde registraties
- Drops in te wisselen voor producten in de webshop
- Hun profiel en bedrijfsgegevens te beheren

Voor beheerders biedt de applicatie een compleet adminpaneel met:

- Gebruikers-, registratie- en productbeheer
- Goedkeuring van registraties met automatische Compenda-synchronisatie
- Puntenbeheeer en -toekenning
- Import/export van gegevens (CSV)
- Uitgebreid logboek van alle beheeracties

De applicatie is volledig Nederlandstalig en voldoet aan AVG/GDPR-wetgeving.

---

## 2. Technische Stack

| Component | Technologie | Versie |
|-----------|-------------|--------|
| **Frontend framework** | React | 19.1.1 |
| **Build tool** | Vite | 7.1.7 |
| **Routering** | React Router | 7.13.0 |
| **Backend/Database** | Firebase (Firestore) | 12.4.0 |
| **Authenticatie** | Firebase Authentication | - |
| **Serverless functies** | Firebase Cloud Functions | - |
| **Bestandsopslag** | Firebase Storage | - |
| **E-mail** | EmailJS | 4.4.1 |
| **CSV verwerking** | PapaParse | 5.5.3 |
| **Hosting** | Firebase Hosting | - |
| **Taal** | JavaScript / JSX | ES2020+ |

### Belangrijke afhankelijkheden

```
react, react-dom        - UI-framework
react-router-dom        - Client-side navigatie
firebase                - Volledige Firebase SDK
papaparse               - CSV import/export parsing
@emailjs/browser        - Client-side e-mailverzending
prop-types              - Runtime type-validatie
```

---

## 3. Projectstructuur

```
mijnfegon-standalone/
├── src/                          # Broncode
│   ├── main.jsx                  # Startpunt van de applicatie
│   ├── App.jsx                   # Hoofdcomponent met routering
│   ├── App.css                   # Globale stijlen
│   ├── firebase.js               # Firebase configuratie & initialisatie
│   │
│   ├── components/               # React-componenten
│   │   ├── Login.jsx             # Inlogpagina
│   │   ├── Register.jsx          # Registratiepagina
│   │   ├── Header.jsx            # Paginakop met navigatie
│   │   ├── Footer.jsx            # Paginavoet
│   │   ├── Dashboard.jsx         # Gebruikersdashboard
│   │   ├── ProfielAanvullen.jsx  # Profiel voltooien (onboarding)
│   │   ├── RegistratieFormulier.jsx  # Productregistratieformulier
│   │   ├── MyRegistrations.jsx   # Overzicht eigen registraties
│   │   ├── Shop.jsx              # Webshop met Drops
│   │   ├── MijnBestellingen.jsx  # Overzicht bestellingen
│   │   ├── Instellingen.jsx      # Gebruikersinstellingen
│   │   ├── ProductenBeheer.jsx   # (Legacy) productbeheer
│   │   ├── CookieBanner.jsx      # Cookie-toestemmingsbanner
│   │   ├── LiveSaldoKnop.jsx     # Realtime saldo-indicator
│   │   │
│   │   └── Admin/                # Beheercomponenten
│   │       ├── AdminLayout.jsx       # Admin layout (sidebar + content)
│   │       ├── AdminDashboard.jsx    # Statistieken & overzicht
│   │       ├── AdminUsers.jsx        # Gebruikersbeheer
│   │       ├── AdminInstallers.jsx   # Installateur-synchronisatie
│   │       ├── AdminRegistraties.jsx # Registratiebeheer
│   │       ├── AdminProducten.jsx    # Productbeheer (shop)
│   │       ├── AdminBestellingen.jsx # Bestellingenbeheer
│   │       ├── AdminPunten.jsx       # Puntenbeheer
│   │       ├── AdminKoppelen.jsx     # Registraties koppelen
│   │       ├── AdminImportExport.jsx # Import/export hub
│   │       ├── AdminLogboek.jsx      # Logboek beheeracties
│   │       ├── AdminInstellingen.jsx # E-mailtemplate beheer
│   │       │
│   │       └── ImportExport/         # Import/export submodules
│   │           ├── IEUsers.jsx           # Gebruikers CSV
│   │           ├── IERegistrations.jsx   # Registraties CSV
│   │           └── IEPoints.jsx          # Punten CSV
│   │
│   ├── pages/                    # Statische pagina's
│   │   ├── PrivacyPolicy.jsx     # Privacybeleid
│   │   └── Voorwaarden.jsx       # Algemene voorwaarden
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useInstallerProfile.js    # Profielbeheer hook
│   │   ├── usePagination.js          # Paginering hook
│   │   └── useAutoLogout.js          # Automatisch uitloggen
│   │
│   ├── services/                 # Externe services
│   │   └── mailService.js        # E-mailverzending (EmailJS)
│   │
│   ├── utils/                    # Hulpfuncties
│   │   ├── dateUtils.js          # Datumformattering (nl-NL)
│   │   └── statusUtils.js        # Statuslabels & stijlen
│   │
│   ├── adminTools/               # Admin hulpmiddelen
│   │   ├── logAdminAction.js     # Logboek schrijffunctie
│   │   └── logAdminActions.js    # (Referentie)
│   │
│   └── styles/                   # CSS-bestanden
│       ├── theme.css             # Kleurenschema & variabelen
│       ├── layout.css            # Lay-out & formulieren
│       └── admin.css             # Admin-specifieke stijlen
│
├── functions/                    # Firebase Cloud Functions
│   ├── index.js                  # Alle serverless functies
│   └── package.json              # Node.js afhankelijkheden
│
├── public/                       # Statische bestanden
│   ├── logo-fegon.png            # Fegon logo
│   ├── logo-mijnfegon.png        # MijnFegon logo
│   └── achtergrond.png           # Achtergrondafbeelding login
│
├── firestore.rules               # Firestore beveiligingsregels
├── firebase.json                 # Firebase hosting configuratie
├── vite.config.js                # Vite build configuratie
├── package.json                  # Project afhankelijkheden
└── eslint.config.js              # Linting configuratie
```

---

## 4. Applicatiearchitectuur

### Opstart (Bootstrap)

1. **`main.jsx`** laadt React 19 met StrictMode
2. Firebase wordt geinitialiseerd via `firebase.js`
3. `BrowserRouter` (React Router v7) wordt opgezet
4. `App.jsx` wordt gerenderd als hoofdcomponent

### App.jsx - Kerncomponent

`App.jsx` is het hart van de applicatie en beheert:

- **Authenticatiestatus** via `onAuthStateChanged` (Firebase Auth)
- **Gebruikersdata** via realtime `onSnapshot` listener op het Firestore-gebruikersdocument
- **Route-beveiliging** via twee wrapper-componenten:
  - `ProtectedRoute` - Alleen voor ingelogde gebruikers met voltooid profiel
  - `AdminRoute` - Alleen voor gebruikers met `role: "admin"`
- **Globale layout** met Header, Footer en CookieBanner

### Globale State

De applicatie gebruikt geen aparte state management library (geen Redux/Context). State wordt beheerd via:

- **`user`** - Firebase Auth gebruikersobject (of `null`)
- **`userData`** - Firestore-document met profielgegevens, rol en saldo
- **`loading`** - Laadstatus tijdens authenticatiecontrole

Deze state wordt als props doorgegeven aan kindcomponenten.

### Realtime Synchronisatie

Alle data wordt realtime gesynchroniseerd via Firestore `onSnapshot` listeners:
- Gebruikersprofiel: direct bijgewerkt bij elke wijziging
- Registraties: direct zichtbaar na indiening of statuswijziging
- Bestellingen: statusupdates direct weergegeven
- Admin logboek: live bijgewerkt

---

## 5. Authenticatie & Autorisatie

### Inlogmethoden

| Methode | Beschrijving |
|---------|-------------|
| **E-mail/Wachtwoord** | Standaard registratie met validatie |
| **Google OAuth** | Inloggen via Google-account met accountselectie |

### Rollen

| Rol | Toegang |
|-----|---------|
| `user` | Alle gebruikerspagina's (dashboard, registraties, shop, instellingen) |
| `admin` | Alle gebruikerspagina's + volledig adminpaneel |

### Authenticatiestroom

```
Nieuwe gebruiker:
  Registreren → Account aanmaken → Firestore-document aanmaken →
  Welkomstmail → Doorsturen naar Profiel Aanvullen →
  Profiel voltooien → 100 welkomst-Drops → Dashboard

Bestaande gebruiker:
  Inloggen → Auth controle → Profiel voltooid? →
    Ja → Dashboard
    Nee → Profiel Aanvullen

Wachtwoord vergeten:
  E-mail invoeren → Cloud Function → Resetlink per e-mail →
  Wachtwoord wijzigen → Opnieuw inloggen
```

### Route-beveiliging

- **Publieke routes** (`/login`, `/register`, `/privacy`, `/voorwaarden`): Geen authenticatie vereist
- **Beveiligde routes** (`/`, `/shop`, etc.): Redirect naar `/login` als niet ingelogd; redirect naar `/profiel-aanvullen` als profiel onvolledig
- **Admin routes** (`/admin/*`): Extra controle op `role === "admin"` in Firestore of Firebase Auth custom claims

---

## 6. Routering

### Publieke pagina's

| Route | Component | Beschrijving |
|-------|-----------|-------------|
| `/login` | `Login.jsx` | Inlogpagina |
| `/register` | `Register.jsx` | Nieuwe account aanmaken |
| `/privacy` | `PrivacyPolicy.jsx` | Privacybeleid |
| `/voorwaarden` | `Voorwaarden.jsx` | Algemene voorwaarden |

### Onboarding

| Route | Component | Beschrijving |
|-------|-----------|-------------|
| `/profiel-aanvullen` | `ProfielAanvullen.jsx` | Profiel voltooien na eerste registratie |

### Beveiligde gebruikerspagina's

| Route | Component | Beschrijving |
|-------|-----------|-------------|
| `/` | `Dashboard.jsx` | Startpagina met saldo en recente activiteit |
| `/registratie-product` | `RegistratieFormulier.jsx` | Nieuw product registreren |
| `/mijn-registraties` | `MyRegistrations.jsx` | Overzicht eigen registraties |
| `/mijn-bestellingen` | `MijnBestellingen.jsx` | Overzicht bestellingen |
| `/shop` | `Shop.jsx` | Webshop (Drops inwisselen) |
| `/instellingen` | `Instellingen.jsx` | Profiel bewerken, data exporteren, account verwijderen |

### Beheerderspagina's

| Route | Component | Beschrijving |
|-------|-----------|-------------|
| `/admin/` | `AdminDashboard.jsx` | Statistieken en overzicht |
| `/admin/users` | `AdminUsers.jsx` | Gebruikersbeheer |
| `/admin/installers` | `AdminInstallers.jsx` | Installateur-synchronisatie naar Compenda |
| `/admin/registraties` | `AdminRegistraties.jsx` | Registraties goedkeuren/afwijzen |
| `/admin/producten` | `AdminProducten.jsx` | Shopproducten beheren |
| `/admin/bestellingen` | `AdminBestellingen.jsx` | Bestellingen afhandelen |
| `/admin/punten` | `AdminPunten.jsx` | Punten toekennen en overzicht |
| `/admin/koppelen` | `AdminKoppelen.jsx` | Losse registraties koppelen aan gebruikers |
| `/admin/import-export` | `AdminImportExport.jsx` | CSV import/export |
| `/admin/logboek` | `AdminLogboek.jsx` | Logboek van beheeracties |
| `/admin/instellingen` | `AdminInstellingen.jsx` | E-mailtemplates beheren |

---

## 7. Gebruikersfuncties

### 7.1 Registreren

**Pagina:** `/register`
**Component:** `Register.jsx`

#### Wat doet het?
Nieuwe installateurs kunnen een account aanmaken via e-mail en wachtwoord.

#### Vereiste velden
- **Naam** - Volledige naam van de installateur
- **Bedrijfsnaam** - Naam van het installatiebedrijf
- **E-mailadres** - Wordt gebruikt als inlognaam
- **Wachtwoord** - Minimaal 6 tekens
- **Wachtwoord bevestigen** - Moet overeenkomen
- **Algemene voorwaarden** - Acceptatie vereist (vinkje)

#### Validaties
- Alle velden verplicht
- Wachtwoorden moeten overeenkomen
- Wachtwoord minimaal 6 tekens
- E-mailadres moet geldig zijn (Firebase Auth validatie)
- Voorwaarden moeten geaccepteerd zijn

#### Wat gebeurt er na registratie?
1. Firebase Auth-account wordt aangemaakt
2. Firestore-gebruikersdocument wordt aangemaakt met:
   - `role: "user"`
   - `profile_completed: false`
   - `saldo: 0`
   - `points_total: 0`
3. Welkomstmail wordt verstuurd
4. Gebruiker wordt doorgestuurd naar `/profiel-aanvullen`

---

### 7.2 Inloggen

**Pagina:** `/login`
**Component:** `Login.jsx`

#### Inlogmethoden

**E-mail/Wachtwoord:**
- Standaard formulier met e-mail en wachtwoord
- Foutmeldingen bij verkeerde gegevens

**Google OAuth:**
- Klik op "Inloggen met Google"
- Google-accountselectie popup verschijnt
- Account wordt automatisch aangemaakt of bijgewerkt in Firestore

#### Wachtwoord vergeten
1. Klik op "Wachtwoord vergeten?"
2. Voer e-mailadres in
3. Cloud Function `sendPasswordResetLink` verstuurt een resetlink per e-mail
4. Klik op de link in de e-mail om een nieuw wachtwoord in te stellen

#### Na inloggen
- `last_login` wordt bijgewerkt in Firestore
- Login-teller (`stats/dashboard.total_logins`) wordt opgehoogd
- Login wordt gelogd in `logs_login`
- Doorsturen naar `/` (dashboard) of `/profiel-aanvullen` als profiel onvolledig

---

### 7.3 Profiel Aanvullen

**Pagina:** `/profiel-aanvullen`
**Component:** `ProfielAanvullen.jsx`

#### Doel
Na de eerste registratie moet de installateur zijn profiel voltooien met bedrijfs- en adresgegevens. Dit is verplicht voordat andere functies beschikbaar worden.

#### Vereiste velden

| Veld | Beschrijving | Validatie |
|------|-------------|-----------|
| Voornaam | Voornaam installateur | Verplicht |
| Achternaam | Achternaam installateur | Verplicht |
| KVK-nummer | Kamer van Koophandel | 8 cijfers |
| Bedrijfsnaam | Naam bedrijf | Verplicht (auto-ingevuld via KVK) |
| Straat | Straatnaam | Verplicht |
| Huisnummer | Huisnummer | Verplicht |
| Toevoeging | Huisnummertoevoeging | Optioneel |
| Postcode | Postcode (1234 AB) | Verplicht |
| Plaats | Plaatsnaam | Verplicht (auto-ingevuld via PDOK) |
| Telefoonnummer | Contactnummer | Verplicht |
| Geboortedatum | Voor verjaardagspunten | Optioneel |

#### Slimme functies

**KVK-opzoeken:**
- Voer een 8-cijferig KVK-nummer in
- Klik op "Opzoeken"
- Cloud Function `kvkCheckHttp` haalt bedrijfsgegevens op
- Bedrijfsnaam en adres worden automatisch ingevuld

**PDOK Adres-aanvulling:**
- Na invoer van postcode en huisnummer
- Straat en plaats worden automatisch opgehaald via de PDOK Locatieserver API

#### Na voltooiing
1. Profiel wordt opgeslagen in Firestore
2. `profile_completed` wordt op `true` gezet
3. **100 welkomst-Drops** worden toegekend (eenmalig, via Cloud Function `awardWelcomePoints`)
4. Gebruiker wordt doorgestuurd naar het dashboard

---

### 7.4 Dashboard

**Pagina:** `/`
**Component:** `Dashboard.jsx`

#### Weergave

Het dashboard is de startpagina na inloggen en toont:

**Welkomstbericht:**
- Begroeting met naam van de installateur en bedrijf

**Saldokaart:**
- Huidig aantal beschikbare Drops (groot weergegeven)
- Blauwe gradient achtergrond
- Badge met "in behandeling" als er punten in afwachting zijn

**Snelknoppen (primair):**
- **Nieuwe Registratie** - Ga direct naar het registratieformulier
- **Shop** - Ga naar de webshop

**Snelknoppen (secundair):**
- Mijn Bestellingen
- Mijn Registraties
- Instellingen

**Recente Activiteit:**
- Laatste 5 registraties met:
  - Datum
  - Product (merk + model)
  - Status (Goedgekeurd / In Behandeling / Afgekeurd)
  - Toegekende punten

#### Databronnen
- Realtime Firestore listener op gebruikersdocument (saldo, naam, etc.)
- Realtime query op registraties (gesorteerd op datum, beperkt tot 5)

---

### 7.5 Product Registratie

**Pagina:** `/registratie-product`
**Component:** `RegistratieFormulier.jsx`

#### Doel
Installateurs registreren hier een geinstalleerd waterbehandelingsproduct voor een klant. Na goedkeuring door een beheerder ontvangt de installateur 50 Drops.

#### Formuliervelden

**Klantgegevens:**

| Veld | Beschrijving |
|------|-------------|
| Geslacht | Man / Vrouw |
| Voornaam | Voornaam klant |
| Tussenvoegsel | Optioneel |
| Achternaam | Achternaam klant |
| Postcode | Klantadres |
| Huisnummer | + optionele toevoeging |
| Straat | Auto-ingevuld via PDOK |
| Plaats | Auto-ingevuld via PDOK |
| Mobiel | Mobiel nummer klant |
| E-mail | E-mailadres klant |

**Productgegevens:**

| Veld | Beschrijving |
|------|-------------|
| Merk | Keuze uit: AquaStar, DigiSoft, Lavigo, Kalkfri, Descale, Softy, Talent, Anders |
| Model | Afhankelijk van merk (vaste lijst of vrij tekstveld bij "Anders") |
| Serienummer | Uniek serienummer van het product |
| Installatiedatum | Datum van installatie |

**Toestemming:**
- Installateur bevestigt dat klant toestemming geeft voor gegevensverwerking
- Algemene voorwaarden moeten geaccepteerd worden

#### Merken en Modellen

| Merk | Beschikbare modellen |
|------|---------------------|
| AquaStar | Vaste modellijst |
| DigiSoft | Vaste modellijst |
| Lavigo | Vaste modellijst |
| Kalkfri | Vaste modellijst |
| Descale | Vaste modellijst |
| Softy | Vaste modellijst |
| Talent | Vaste modellijst |
| Anders | Vrij tekstveld |

#### Validaties en waarschuwingen
- **Serienummer**: Formaat wordt gecontroleerd (2 letters + 6 cijfers voor de meeste merken; Talent/Delta: 9-11 cijfers)
- **Installatiedatum**: Waarschuwing als de datum meer dan 1 jaar geleden is
- **PDOK**: Automatisch adres aanvullen bij invoer postcode + huisnummer
- **Toestemming**: Klant-toestemming is verplicht

#### Wat wordt opgeslagen?

Bij indiening wordt een document aangemaakt in de `registrations` collectie met:
- Installateurgegevens (uid, e-mail, naam, bedrijf)
- Klantgegevens (alle bovenstaande velden)
- Productgegevens (merk, model, serienummer, installatiedatum)
- `status: "pending"` (in behandeling)
- `is_safe_to_automate`: automatische veiligheidscheck
- `warning_reasons`: lijst met eventuele waarschuwingen
- Toestemmingsvelden met tijdstempel en versie privacybeleid
- `created_at`: servertijdstempel

#### Na indiening
1. Document wordt opgeslagen in Firestore
2. Bevestigingsmail wordt verstuurd naar de installateur
3. Registratie verschijnt bij de beheerder ter goedkeuring
4. Installateur ziet de registratie terug op de pagina "Mijn Registraties"

---

### 7.6 Mijn Registraties

**Pagina:** `/mijn-registraties`
**Component:** `MyRegistrations.jsx`

#### Weergave
Een tabel met alle registraties van de ingelogde installateur:

| Kolom | Beschrijving |
|-------|-------------|
| Datum | Datum van indiening |
| Machine | Merk + model + serienummer |
| Klant | Naam + plaats |
| Status | Goedgekeurd / In Behandeling / Afgekeurd |
| Punten | 50 bij goedkeuring, 0 bij afwijzing |

#### Uitklapbare details
Klik op een rij om de volledige details te zien:
- Contactgegevens (naam, e-mail, telefoon)
- Installatieadres (straat, huisnummer, postcode, plaats)
- Machine-informatie (merk, model, serienummer, installatiedatum)

#### Statusbadges

| Status | Kleur | Punten |
|--------|-------|--------|
| Goedgekeurd | Groen | +50 Drops |
| In Behandeling | Geel | - |
| Afgekeurd | Grijs | 0 Drops |

#### Realtime updates
De tabel wordt direct bijgewerkt wanneer een beheerder een registratie goedkeurt of afwijst.

---

### 7.7 Shop

**Pagina:** `/shop`
**Component:** `Shop.jsx`

#### Doel
Installateurs kunnen hun verdiende Drops inwisselen voor producten in de webshop.

#### Functies
- **Categoriefilter**: Filter producten op categorie (configureerbaar door beheerder)
- **Productoverzicht**: Grid met afbeeldingen, beschrijvingen en prijzen
- **Bestellen**: Klik om te bestellen met bevestigingsdialoog
- **Saldo-check**: Minimaal 250 Drops vereist om de shop te gebruiken

#### Productweergave
Elk product toont:
- Naam
- Beschrijving
- Prijs (in Drops)
- Afbeelding (vanuit Firebase Storage of standaardafbeelding)

#### Beperkingen
- **Minimaal saldo**: 250 Drops nodig om te kunnen winkelen
- **Saldo-controle**: Productprijs moet lager of gelijk zijn aan beschikbaar saldo
- **Shop vergrendeld**: Als saldo < 250, wordt de shop visueel vergrendeld met melding

#### Bestelproces
1. Klik op "Bestellen" bij een product
2. Bevestigingsdialoog verschijnt
3. Cloud Function `purchaseProduct` wordt aangeroepen
4. Drops worden afgetrokken van het saldo
5. Bestelling verschijnt in "Mijn Bestellingen"

---

### 7.8 Mijn Bestellingen

**Pagina:** `/mijn-bestellingen`
**Component:** `MijnBestellingen.jsx`

#### Weergave
Een lijst van alle bestellingen van de ingelogde gebruiker:

| Kolom | Beschrijving |
|-------|-------------|
| Product | Naam van het bestelde product |
| Datum | Besteldatum |
| Prijs | Aantal Drops |
| Status | Actuele status |

#### Bestelstatussen

| Status | Beschrijving |
|--------|-------------|
| Nieuw | Bestelling ontvangen |
| In behandeling | Bestelling wordt verwerkt |
| Verzonden | Product is verstuurd |
| Geannuleerd | Bestelling is geannuleerd |

#### Lege staat
Als er nog geen bestellingen zijn, wordt een passende melding getoond.

---

### 7.9 Instellingen

**Pagina:** `/instellingen`
**Component:** `Instellingen.jsx`
**Hook:** `useInstallerProfile.js`

#### Profielbeheer
De installateur kan zijn profielgegevens bijwerken:
- Volledige naam
- KVK-nummer (met opzoekfunctie)
- Bedrijfsnaam
- Telefoonnummer
- Adres (straat, huisnummer, postcode, plaats)
- Geboortedatum

Bij het opslaan wordt een e-mailnotificatie verstuurd (`sendProfileChangedEmail`).

#### Gegevensexport (AVG Artikel 20)
- Klik op "Gegevens exporteren"
- Download een JSON-bestand met:
  - Alle profielgegevens
  - Alle registraties
- Bestandsnaam: `mijnfegon-export-JJJJ-MM-DD.json`

#### Account verwijderen (AVG Artikel 17)
1. Klik op "Account verwijderen"
2. Type het woord **"VERWIJDEREN"** als bevestiging
3. Cloud Function `deleteUserAccount` wordt aangeroepen
4. Firebase Auth-account wordt verwijderd
5. Firestore-gegevens worden geanonimiseerd (niet verwijderd, voor audit)
6. Registraties worden geanonimiseerd (klantnaam wordt "Deleted User")
7. Gebruiker wordt automatisch uitgelogd

---

## 8. Beheerdersfuncties (Admin)

Het adminpaneel is beschikbaar voor gebruikers met `role: "admin"` en is bereikbaar via het pad `/admin/`. Het paneel heeft een eigen layout met een zijbalkmenu.

### Adminmenu

Het zijbalkmenu bevat links naar alle beheerpagina's:
- Dashboard
- Gebruikers
- Installateurs
- Registraties
- Producten
- Bestellingen
- Punten
- Koppelen
- Import/Export
- Logboek
- Instellingen

---

### 8.1 Admin Dashboard

**Pagina:** `/admin/`
**Component:** `AdminDashboard.jsx`

#### Statistieken (realtime)

| Metriek | Beschrijving | Bron |
|---------|-------------|------|
| Totaal gebruikers | Aantal geregistreerde installateurs | `getCountFromServer(users)` |
| Nieuwe gebruikers | Gebruikers aangemeld deze maand | Query met datumfilter |
| Totaal registraties | Aantal ingediende registraties | `getCountFromServer(registrations)` |
| Totaal logins | Aantal keer ingelogd (alle gebruikers) | `stats/dashboard.total_logins` |
| Totaal verdiende Drops | Som van alle `points_total` | Berekend |
| Totaal beschikbare Drops | Som van alle `saldo` | Berekend |

#### Interactieve tabellen
- Klik op een metriek om een gedetailleerde tabel te openen
- Sorteerbaar op verdiende punten of beschikbaar saldo
- Filterbaar

#### Beheerdersinformatie
- Toont het profiel van de huidige ingelogde beheerder

---

### 8.2 Gebruikersbeheer

**Pagina:** `/admin/users`
**Component:** `AdminUsers.jsx`

#### Overzicht

| Kolom | Beschrijving |
|-------|-------------|
| E-mail | E-mailadres |
| Naam | Volledige naam |
| Bedrijf | Bedrijfsnaam |
| Aangemaakt | Registratiedatum |
| Registraties | Aantal ingediende registraties |
| Punten | Totaal verdiende Drops |
| Saldo | Beschikbaar saldo |

#### Functies
- **Zoeken**: Filter op e-mail, naam of bedrijf
- **Sorteren**: Op aantal registraties
- **Paginering**: 25 gebruikers per pagina
- **Totalen**: Overzicht van admin-accounts, totaal gebruikers en registraties

---

### 8.3 Installateurs (Compenda Sync)

**Pagina:** `/admin/installers`
**Component:** `AdminInstallers.jsx`

#### Doel
Synchronisatie van installateurprofielen met het externe Compenda-systeem.

#### Proces
1. Installateurprofiel wordt opgehaald uit Firebase
2. Controle of `compenda_company_id` al gekoppeld is
3. Zo niet: zoeken in Compenda op bedrijfsnaam of e-mail
4. Niet gevonden: automatisch aanmaken in Compenda
5. `compenda_company_id` wordt opgeslagen in Firebase

---

### 8.4 Registratiebeheer

**Pagina:** `/admin/registraties`
**Component:** `AdminRegistraties.jsx`

#### Overzicht
Een tabel van alle registraties, gesorteerd op datum (nieuwste eerst), met:
- Datum, installateur, klant, product, status
- Uitklapbare rijen met volledige details
- Statusbadges met inline goedkeuring/afwijzing

#### Serienummeranalyse
Het systeem analyseert automatisch serienummers:
- **Formaatvalidatie**: 2 letters + 6 cijfers (voor de meeste merken)
- **Talent/Delta**: Speciale afhandeling (9-11 cijferige serienummers)
- **Datumvalidatie**: Controle installatiedatum versus productiedatum uit serienummer
- **Waarschuwingen**: Worden weergegeven als `warning_reasons`

#### Goedkeuringsworkflow

```
1. Beheerder klikt "Goedkeuren"
2. Cloud Function `approveRegistration` wordt aangeroepen
3. De functie:
   a. Controleert of installateur bestaat in Compenda (of maakt hem aan)
   b. Verstuurt registratie naar Compenda API
   c. Kent 50 Drops toe aan de installateur (atomische batch-update)
   d. Verstuurt goedkeuringsmails (naar installateur + beheerder)
   e. Zet `synced_to_compenda: true`
4. Registratiestatus wordt "approved", punten: 50
5. Beheeractie wordt gelogd in logboek
```

#### Afwijzing
- Beheerder klikt "Afwijzen"
- Status wordt `rejected`
- Geen punten worden toegekend
- Actie wordt gelogd met reden

---

### 8.5 Productenbeheer

**Pagina:** `/admin/producten`
**Component:** `AdminProducten.jsx`

#### Functies
- **Toevoegen**: Nieuw product aanmaken met naam, beschrijving, prijs, categorie
- **Bewerken**: Bestaande productgegevens wijzigen
- **Verwijderen**: Product verwijderen uit de shop
- **Afbeelding uploaden**: Productfoto uploaden naar Firebase Storage
- **Actief/Inactief**: Product zichtbaar of verborgen in de shop
- **Categoriebeheer**: Categorieen aanpassen (opgeslagen in `settings/shop_config`)

#### Productvelden

| Veld | Beschrijving |
|------|-------------|
| Naam | Productnaam |
| Beschrijving | Productomschrijving |
| Prijs | Prijs in Drops |
| Afbeelding | URL of upload |
| Categorie | Productcategorie |
| Actief | Zichtbaar in shop (ja/nee) |

---

### 8.6 Bestellingenbeheer

**Pagina:** `/admin/bestellingen`
**Component:** `AdminBestellingen.jsx`

#### Overzicht

| Kolom | Beschrijving |
|-------|-------------|
| Gebruiker | Naam van de besteller |
| Product | Besteld product |
| Drops | Betaalde Drops |
| Datum | Besteldatum |
| Status | Huidige status (selecteerbaar) |

#### Statusbeheer
De beheerder kan de status van elke bestelling wijzigen via een dropdown:
- **Nieuw** → **In behandeling** → **Verzonden**
- Of: **Geannuleerd**

Wijzigingen worden direct doorgevoerd en zijn realtime zichtbaar voor de gebruiker.

---

### 8.7 Puntenbeheer

**Pagina:** `/admin/punten`
**Component:** `AdminPunten.jsx`

#### Gebruikersoverzicht

| Kolom | Beschrijving |
|-------|-------------|
| Naam | Installateursnaam |
| Bedrijf | Bedrijfsnaam |
| E-mail | E-mailadres |
| Verdiend (`points_total`) | Totaal ooit verdiende Drops |
| Beschikbaar (`saldo`) | Huidig inwisselbaar saldo |
| Uitgegeven | Verschil (verdiend - beschikbaar) |
| In behandeling | Aantal registraties met status "pending" |

#### Functies
- **Zoeken en filteren**: Op naam, bedrijf of e-mail
- **Sorteren**: Op diverse kolommen
- **Paginering**: Voor grote aantallen gebruikers
- **Handmatige aanpassing**: Beheerder kan punten handmatig bijstellen
- **Logging**: Alle wijzigingen worden gelogd met tijdstempel

---

### 8.8 Registraties Koppelen

**Pagina:** `/admin/koppelen`
**Component:** `AdminKoppelen.jsx`

#### Doel
Soms worden registraties ingediend zonder koppeling aan een gebruikersaccount (weesregistraties). Deze pagina helpt bij het koppelen.

#### Werkwijze
1. Het systeem toont registraties waar `installer_uid` ontbreekt (null)
2. **Automatische matching**: Op basis van e-mailadres (`installer_email` vs. `user.email`)
3. **Handmatige selectie**: Beheerder kan de juiste gebruiker selecteren
4. Bij koppeling wordt `installer_uid` bijgewerkt
5. Actie wordt gelogd in het logboek

---

### 8.9 Import/Export

**Pagina:** `/admin/import-export`
**Component:** `AdminImportExport.jsx`

De import/export-pagina heeft drie tabbladen:

#### Tabblad 1: Gebruikers (`IEUsers.jsx`)

**Export:**
- Exporteert alle gebruikersdocumenten als CSV-bestand
- Velden: uid, email, naam, bedrijf, punten, saldo, aanmaakdatum, etc.

**Import:**
- Upload een CSV-bestand
- Batch upsert naar Firestore (bestaande documenten worden bijgewerkt)

#### Tabblad 2: Registraties (`IERegistrations.jsx`)

**Export:**
- Exporteert alle registraties als CSV-bestand
- Velden: installer_uid, klantnaam, merk, status, punten, datum, etc.

**Import:**
- Upload een CSV-bestand
- Registraties worden aangemaakt of bijgewerkt

#### Tabblad 3: Punten (`IEPoints.jsx`)

**Export:**
- Exporteert een overzicht van punten per gebruiker als CSV
- Velden: uid, email, punten_totaal, saldo

**Import:**
- Upload een CSV met puntenwijzigingen
- Batch-update van `points_total` en `saldo`
- Alle wijzigingen worden gelogd

#### Technisch
- CSV-verwerking via de **PapaParse** bibliotheek
- Bestanden worden client-side verwerkt
- Batch-operaties voor efficiënte Firestore-updates

---

### 8.10 Logboek

**Pagina:** `/admin/logboek`
**Component:** `AdminLogboek.jsx`

#### Doel
Een onveranderlijk logboek van alle beheeracties voor audit en traceerbaarheid.

#### Weergave
- Realtime stream van de laatste 300 beheeracties
- Gesorteerd op datum (nieuwste eerst)

#### Filters

| Filter | Opties |
|--------|--------|
| Type | user, points, product, registration, linking, other |
| Beheerder | Zoeken op e-mailadres |

#### Gelogde gebeurtenissen

| Type | Voorbeelden |
|------|------------|
| `user_create` | Nieuwe gebruiker aangemaakt |
| `user_update` | Gebruikersprofiel bijgewerkt |
| `user_delete` | Gebruikersaccount verwijderd |
| `points_award` | Punten toegekend |
| `points_deduct` | Punten afgetrokken |
| `product_create` | Nieuw product toegevoegd |
| `product_update` | Product bijgewerkt |
| `product_delete` | Product verwijderd |
| `registration_approve` | Registratie goedgekeurd |
| `registration_reject` | Registratie afgewezen |
| `linking_registration_installer` | Registratie gekoppeld aan installateur |

#### Beveiliging
- Logregels zijn **onveranderlijk** (immutable)
- Firestore-regels blokkeren updates en verwijderingen
- Alleen beheerders kunnen logregels aanmaken en lezen

---

### 8.11 Admin Instellingen

**Pagina:** `/admin/instellingen`
**Component:** `AdminInstellingen.jsx`

#### E-mailtemplates
- Bekijk en bewerk onderwerp en HTML-inhoud van EmailJS-templates
- Opslaan werkt de `mailTemplates` collectie bij in Firestore

---

## 9. Puntensysteem (Drops)

Het loyaliteitsprogramma van MijnFegon werkt met **Drops** als virtuele munteenheid.

### Drops verdienen

| Actie | Drops | Frequentie |
|-------|-------|------------|
| Profiel voltooien (welkomstbonus) | 100 | Eenmalig |
| Productregistratie goedgekeurd | 50 | Per registratie |
| Verjaardag | 100 | Jaarlijks |

### Drops uitgeven

| Actie | Voorwaarde |
|-------|-----------|
| Product kopen in shop | Minimaal 250 Drops saldo vereist |

### Velden in Firestore

| Veld | Beschrijving |
|------|-------------|
| `saldo` | Beschikbare (inwisselbare) Drops |
| `points_total` | Totaal ooit verdiende Drops |
| `points_pending` | Drops in afwachting van goedkeuring |

### Berekening
- **Verdiend**: `points_total` (wordt alleen opgehoogd)
- **Beschikbaar**: `saldo` (wordt opgehoogd bij verdienen, verlaagd bij uitgeven)
- **Uitgegeven**: `points_total - saldo`

### Welkomstbonus
- Wordt eenmalig toegekend bij het voltooien van het profiel
- Cloud Function `awardWelcomePoints` is idempotent (controleert `welcome_points_awarded` vlag)
- Kan niet opnieuw worden toegekend

### Verjaardagsbonus
- Dagelijks om 08:00 uur (tijdzone Amsterdam) controleert een geplande Cloud Function
- Gebruikers met een geboortedatum die vandaag matcht ontvangen 100 bonus-Drops
- Controle op `birthday_points_year` voorkomt dubbele toekenning per jaar
- Verjaardagsmail wordt automatisch verstuurd

---

## 10. Firebase Structuur

### 10.1 Firestore Collecties

#### `users/{uid}` - Gebruikersprofielen

```javascript
{
  uid: "Firebase Auth UID",
  email: "installateur@bedrijf.nl",
  installer_full_name: "Jan de Vries",
  installer_company: "Waterbedrijf BV",
  installer_phone: "0612345678",
  installer_kvk: "12345678",
  installer_address: "Hoofdstraat 1, 1234 AB Amsterdam",
  company_name: "Waterbedrijf BV",
  firstName: "Jan",
  lastName: "de Vries",
  street: "Hoofdstraat",
  houseNumber: "1",
  houseAddition: "",
  postalCode: "1234 AB",
  city: "Amsterdam",
  phoneNumber: "0612345678",
  birthDate: "1985-03-15",
  role: "user",                    // "user" of "admin"
  profile_completed: true,
  saldo: 250,                      // Beschikbare Drops
  points_total: 350,               // Totaal verdiende Drops
  points_pending: 0,
  compenda_company_id: "12345",    // Compenda koppeling
  compenda_id: "67890",
  welcome_points_awarded: true,    // Welkomstbonus toegekend
  birthday_points_year: 2025,      // Laatste verjaardagsbonus jaar
  createdAt: Timestamp,
  updatedAt: Timestamp,
  last_login: Timestamp
}
```

#### `registrations/{docId}` - Productregistraties

```javascript
{
  // Installateurgegevens
  installer_uid: "Firebase Auth UID",
  installer_email: "installateur@bedrijf.nl",
  installer_name: "Jan de Vries",
  installer_company: "Waterbedrijf BV",

  // Klantgegevens
  customer_gender: "male",         // "male" of "female"
  customer_first_name: "Piet",
  customer_middle_name: "van",
  customer_last_name: "Berg",
  customer_postcode: "5678 CD",
  customer_house_number: "42",
  customer_house_addition: "A",
  customer_street: "Kerkstraat",
  customer_city: "Rotterdam",
  customer_mobile_phone: "0687654321",
  customer_landline_phone: "",
  customer_email: "klant@email.nl",

  // Productgegevens
  product_brand: "AquaStar",
  product_model: "AS-500",
  product_installation_date: "2025-11-20",
  product_serial_number: "AB123456",

  // Status
  status: "pending",               // "pending", "approved", "rejected"
  points_awarded: 0,               // 50 bij goedkeuring
  points_claimed: false,
  is_safe_to_automate: true,
  warning_reasons: [],

  // Toestemming
  consent_personal_data: true,
  consent_accepted_at: Timestamp,
  consent_privacy_policy_version: "1.0",
  installer_confirmed_customer_consent: true,

  // Compenda synchronisatie
  synced_to_compenda: false,
  compenda_id: "",
  compenda_sync_date: null,

  created_at: Timestamp
}
```

#### `orders/{docId}` - Bestellingen

```javascript
{
  userId: "Firebase Auth UID",
  productId: "product_doc_id",
  productName: "Bosch Waterpas",
  userName: "Jan de Vries",
  price: 150,                      // Betaalde Drops
  status: "Nieuw",                 // "Nieuw", "In behandeling", "Verzonden", "Geannuleerd"
  createdAt: Timestamp
}
```

#### `products/{docId}` - Shopproducten

```javascript
{
  name: "Bosch Waterpas",
  description: "Professionele waterpas 60cm",
  price: 150,                      // Prijs in Drops
  image: "https://storage.url/afbeelding.jpg",
  category: "Gereedschap",
  active: true,                    // Zichtbaar in shop
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `logs_admin/{docId}` - Beheerlogboek

```javascript
{
  type: "registration_approve",    // Actietype
  description: "Registratie AB123456 goedgekeurd",
  collectionName: "registrations",
  docId: "reg_doc_id",
  before: { status: "pending" },   // Vorige waarde
  after: { status: "approved" },   // Nieuwe waarde
  adminUid: "admin_uid",
  adminEmail: "admin@fegon.nl",
  createdAt: Timestamp
}
```

#### `logs_login/{docId}` - Inloglogboek

```javascript
{
  uid: "Firebase Auth UID",
  email: "installateur@bedrijf.nl",
  method: "email",                 // "email" of "google"
  timestamp: Timestamp
}
```

#### `stats/dashboard` - Statistieken

```javascript
{
  total_logins: 1234               // Totaal aantal logins (alle gebruikers)
}
```

#### `settings/shop_config` - Shopconfiguratie

```javascript
{
  categories: ["Cadeau's", "Gereedschap", "Kleding", "Huishouden"]
}
```

---

### 10.2 Beveiligingsregels

De Firestore-beveiligingsregels zorgen voor strikte toegangscontrole:

#### Gebruikers (`users`)
- **Lezen**: Eigen document of alle als admin
- **Aanmaken**: Alleen met `role: "user"`, nul punten
- **Bijwerken**: Gebruiker mag alleen veilige profielvelden wijzigen; `profile_completed` kan niet teruggezet worden naar `false`
- **Admin**: Mag alle velden bijwerken

#### Registraties (`registrations`)
- **Aanmaken**: Alleen als ingelogd, met status `"pending"`
- **Lezen**: Eigen registraties of alle als admin
- **Bijwerken/Verwijderen**: Alleen door admins

#### Bestellingen (`orders`)
- **Aanmaken/Lezen**: Eigen bestellingen of alle als admin
- **Bijwerken/Verwijderen**: Alleen door admins

#### Beheerlogboek (`logs_admin`)
- **Aanmaken/Lezen**: Alleen door admins
- **Bijwerken/Verwijderen**: **Geblokkeerd** (onveranderlijk)

#### Statistieken (`stats/dashboard`)
- Alle ingelogde gebruikers mogen `total_logins` ophogen
- Admins hebben volledig beheer

---

## 11. Cloud Functions

Alle serverless functies draaien op **Firebase Cloud Functions** in de regio `europe-west1` (Belgie).

### approveRegistration (onCall, admin-only)

**Doel:** Registratie goedkeuren, synchroniseren naar Compenda en punten toekennen.

**Stappen:**
1. Controle of aanroeper admin-rechten heeft
2. Registratiedocument ophalen
3. Installateur aanmaken/opzoeken in Compenda API
4. Registratie versturen naar Compenda (`POST /companies/{id}/registrations`)
5. Atomische batch-update:
   - Registratiestatus → `approved`, `points_awarded: 50`
   - Gebruiker: `points_total +50`, `saldo +50`
6. Detectie of het de eerste registratie is (`isFirstRegistration`)
7. Goedkeuringsmails versturen (installateur + beheerder)
8. Compenda-ID en punten retourneren

### awardWelcomePoints (onCall, gebruiker)

**Doel:** 100 welkomst-Drops toekennen bij eerste profiel voltooiing.

**Werking:**
- Controleert `welcome_points_awarded` vlag
- Als `false`: verhoogt `saldo` en `points_total` met 100
- Zet vlag op `true` om dubbele toekenning te voorkomen (idempotent)

### sendPasswordResetLink (onCall, publiek)

**Doel:** Wachtwoord-resetlink versturen per e-mail.

**Parameters:** `{ email: "gebruiker@email.nl" }`

### purchaseProduct (onCall, gebruiker)

**Doel:** Product kopen met Drops.

**Stappen:**
1. Huidig saldo ophalen
2. Productprijs ophalen
3. Validatie: minimaal 250 Drops en saldo >= prijs
4. Besteldocument aanmaken
5. Saldo verlagen
6. Bestelling-ID retourneren

### kvkCheckHttp (onRequest, publiek)

**Doel:** KVK-nummer verifiëren via externe API.

**Retourneert:** Bedrijfsnaam, adresgegevens

### deleteUserAccount (onCall, gebruiker)

**Doel:** AVG-conforme accountverwijdering.

**Stappen:**
1. Verificatie dat gebruiker is ingelogd
2. Firebase Auth-account verwijderen
3. Firestore-gebruikersdocument anonimiseren
4. Registraties anonimiseren (klantnaam → "Deleted User")

### Verjaardagspunten (onSchedule)

**Frequentie:** Dagelijks om 08:00 uur (tijdzone Amsterdam)

**Werking:**
- Zoekt gebruikers met geboortedatum = vandaag
- Kent 100 bonus-Drops toe (als niet al dit jaar toegekend)
- Verstuurt verjaardagsmail

### Heractivering (onSchedule)

**Frequentie:** Wekelijks

**Werking:**
- Zoekt gebruikers die >90 dagen niet ingelogd zijn
- Verstuurt heractiveringsmail

---

## 12. Externe Koppelingen

### 12.1 Compenda API

**URL:** `https://mijnfegontest.compenda-app.nl` (testomgeving)

**Doel:** Synchronisatie van installateurs en productregistraties met het externe Compenda-garantiesysteem.

**Authenticatie:** Bearer token (`COMPENDA_TOKEN` secret)

#### Installateurkoppeling (`ensureInstallerExistsInCompenda`)

```
1. Haal installateurprofiel op uit Firebase
2. Controleer of compenda_company_id al opgeslagen is
3. Verifieer dat opgeslagen ID nog geldig is (GET /companies/{id})
4. Zo niet: zoek bedrijf op naam of e-mail (GET /companies?search=...)
5. Niet gevonden: maak nieuw bedrijf aan (POST /companies)
6. Sla compenda_company_id op in Firebase
7. Retourneer bedrijfs-ID
```

#### Registratieverzending (`processRegistrationLogic`)

```
POST /companies/{company_id}/registrations

Body:
{
  serial_number: "AB123456",
  brand: "AquaStar",
  model: "AS-500",
  installation_date: "2025-11-20",
  customer: {
    full_name: "Piet van Berg",
    email: "klant@email.nl",
    phone_number: "0687654321",
    gender: "male",
    address: {
      street: "Kerkstraat",
      house_number: "42",
      postal_code: "5678 CD",
      city: "Rotterdam",
      country: "NL"
    }
  }
}
```

---

### 12.2 KVK API

**Doel:** Verificatie van KVK-nummers en ophalen van bedrijfsgegevens.

**Werking:**
- Cloud Function `kvkCheckHttp` ontvangt een KVK-nummer
- Vraagt gegevens op bij de officiële KVK API
- Retourneert: bedrijfsnaam, adres (straat, nummer, postcode, plaats)

**Gebruik in de app:**
- Profiel aanvullen (onboarding)
- Instellingen (profielwijziging)

---

### 12.3 PDOK Adresservice

**API:** `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free`

**Doel:** Automatisch aanvullen van adressen op basis van postcode en huisnummer.

**Werking:**
- Gebruiker voert postcode en huisnummer in
- API retourneert straatnaam en plaatsnaam
- Velden worden automatisch ingevuld

**Gebruik in de app:**
- Profiel aanvullen
- Productregistratieformulier (klantadres)
- Instellingen

---

### 12.4 EmailJS

**Service ID:** `service_jo37avf`

**Doel:** E-mailverzending vanuit zowel de client als Cloud Functions.

**Werking:**
- Client-side: via `@emailjs/browser` SDK
- Server-side: via EmailJS REST API (`https://api.emailjs.com/api/v1.0/email/send`)

---

## 13. E-mailsysteem

### Overzicht van e-mailtemplates

| Template | Naam | Trigger | Ontvanger |
|----------|------|---------|-----------|
| `template_g3qdnvi` | Welkomstmail | Accountregistratie | Installateur |
| `template_0r7gx12` | Wachtwoord reset | Wachtwoord vergeten | Gebruiker |
| `template_yhh1q9v` | Bevestiging indiening | Na registratie-indiening | Installateur |
| `template_6uikpzw` | Eerste registratie | Eerste registratie goedgekeurd | Installateur |
| `template_wpc7r3y` | Goedkeuring | Registratie goedgekeurd | Installateur |
| `template_ruu8qfg` | Verjaardag | Verjaardagsbonus (dagelijks) | Installateur |
| `template_rri4zql` | Heractivering | >90 dagen inactief (wekelijks) | Installateur |
| `template_k4ntgd9` | Admin notificatie | Registratie goedgekeurd | gilmar.korts@fegon.nl |

### Mailfuncties (`mailService.js`)

| Functie | Beschrijving |
|---------|-------------|
| `sendWelcomeEmail(email, naam)` | Welkomstmail bij registratie |
| `sendSubmissionConfirmation(registratie)` | Bevestiging na indiening registratie |
| `sendApprovalEmails(reg, compendaId, punten, eersteRegistratie)` | Goedkeuringsmail naar installateur + admin |
| `sendProfileChangedEmail(email, naam)` | Melding bij profielwijziging |

---

## 14. Styling & Thema

### Kleurenschema

| Variabele | Kleur | Gebruik |
|-----------|-------|--------|
| `--primary` | `#0066ff` | Knoppen, links, accenten |
| `--primary-dark` | `#002b5c` | Header, donkere elementen |
| `--bg` | `#f5f7fa` | Pagina-achtergrond |
| `--text` | `#1a1a1a` | Standaard tekst |
| `--card` | `#ffffff` | Kaarten en panelen |
| `--shadow` | `rgba(0,0,0,0.06)` | Schaduweffecten |
| Succes | `#16a34a` | Goedgekeurde statussen |
| Fout | `#ff4d4f` | Foutmeldingen, verwijderknoppen |
| Waarschuwing | `#f59e0b` | Waarschuwingen, "in behandeling" |

### CSS-bestanden

| Bestand | Inhoud |
|---------|--------|
| `theme.css` | CSS-variabelen, knopstijlen, basiscomponenten |
| `layout.css` | Paginaindeling, formulieren, navigatie, kaarten |
| `admin.css` | Adminpaneel layout, tabellen, sidebar, statistiekkaarten |
| `App.css` | Globale container-instellingen |

### Responsive design
De applicatie is responsief ontworpen met CSS-media-queries. Er is momenteel geen apart mobiel navigatiemenu.

---

## 15. Privacy & AVG/GDPR

MijnFegon voldoet aan de Algemene Verordening Gegevensbescherming (AVG/GDPR):

### Geimplementeerde maatregelen

| AVG-artikel | Implementatie |
|-------------|--------------|
| **Art. 6 - Toestemming** | Cookie-toestemmingsbanner, toestemmingsvinkjes bij registratie |
| **Art. 13 - Informatieverstrekking** | Privacybeleid-pagina (`/privacy`) |
| **Art. 17 - Recht op vergetelheid** | Accountverwijdering met data-anonimisering |
| **Art. 20 - Dataportabiliteit** | Gegevensexport als JSON-bestand |

### Toestemmingsregistratie
Bij elke productregistratie wordt vastgelegd:
- `consent_personal_data`: Toestemming voor gegevensverwerking
- `consent_accepted_at`: Tijdstempel van toestemming
- `consent_privacy_policy_version`: Versie van het privacybeleid
- `installer_confirmed_customer_consent`: Bevestiging door installateur

### Cookie-toestemming
- `CookieBanner.jsx` toont een banner bij het eerste bezoek
- Keuze wordt opgeslagen in `localStorage`
- Banner verschijnt niet opnieuw na acceptatie

### Accountverwijdering
- Gebruiker kan account verwijderen via Instellingen
- Bevestiging door het woord "VERWIJDEREN" te typen
- Firebase Auth-account wordt verwijderd
- Persoonsgegevens worden geanonimiseerd (niet verwijderd, voor audit)
- Registraties worden geanonimiseerd

### Pagina's
- `/privacy` - Volledig privacybeleid
- `/voorwaarden` - Algemene voorwaarden

---

## 16. Deployment & Hosting

### Firebase Hosting

**Configuratie (`firebase.json`):**
- **Public folder:** `dist` (gebouwde Vite-output)
- **SPA routing:** Alle routes verwijzen naar `/index.html` (404-fallback)

### Beveiligingsheaders

| Header | Waarde |
|--------|--------|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | SAMEORIGIN |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | Geen camera/microfoon/geolocatie |
| Content-Security-Policy | Strict (Firebase + PDOK + Google APIs toegestaan) |

### Cloud Functions
- **Bronmap:** `./functions`
- **Runtime:** Node.js
- **Regio:** `europe-west1` (Belgie)
- **Pre-deploy:** `npm lint`

### Deployen

```bash
# Frontend bouwen en deployen
npm run build
firebase deploy --only hosting

# Cloud Functions deployen
firebase deploy --only functions

# Firestore-regels deployen
firebase deploy --only firestore:rules

# Alles tegelijk
firebase deploy
```

---

## 17. Ontwikkelomgeving

### Vereisten
- Node.js (LTS-versie aanbevolen)
- npm
- Firebase CLI (`npm install -g firebase-tools`)

### Installatie

```bash
# Project klonen
git clone https://github.com/gilmarfegon-oss/mijnfegon-standalone.git
cd mijnfegon-standalone

# Afhankelijkheden installeren
npm install

# Cloud Functions afhankelijkheden installeren
cd functions && npm install && cd ..
```

### Beschikbare scripts

| Script | Commando | Beschrijving |
|--------|----------|-------------|
| Ontwikkelmodus | `npm run dev` | Start Vite dev server (localhost:5173 met HMR) |
| Bouwen | `npm run build` | Bouwt productieversie naar `dist/` |
| Voorbeeld | `npm run preview` | Preview van de gebouwde versie |
| Linting | `npm run lint` | ESLint controle op `src/` |

### Omgevingsvariabelen / Secrets

De Firebase-configuratie staat in `src/firebase.js` (client-side, publiek).

Cloud Functions gebruiken Firebase Secrets voor gevoelige data:
- `COMPENDA_TOKEN` - API-token voor Compenda
- `KVK_API_KEY` - API-sleutel voor KVK-verificatie

### Linting
ESLint is geconfigureerd met:
- Standaard JavaScript-regels
- React-specifieke regels
- React Hooks regels

---

## Bijlage: Veelgestelde vragen

### Hoe wordt een nieuwe installateur toegevoegd?
1. De installateur registreert zich via `/register`
2. Na registratie wordt het profiel aangevuld via `/profiel-aanvullen`
3. Na voltooiing ontvangt hij 100 welkomst-Drops en krijgt toegang tot alle functies

### Hoe verdient een installateur Drops?
- **100 Drops** bij het voltooien van het profiel (eenmalig)
- **50 Drops** per goedgekeurde productregistratie
- **100 Drops** op zijn verjaardag (jaarlijks)

### Wat is het minimale saldo voor de shop?
250 Drops. Onder dit bedrag is de shop vergrendeld.

### Hoe werkt de Compenda-synchronisatie?
Bij goedkeuring van een registratie:
1. Het systeem controleert of de installateur al in Compenda staat
2. Zo niet, wordt hij automatisch aangemaakt
3. De registratie wordt naar Compenda verstuurd
4. Het Compenda-ID wordt opgeslagen voor toekomstige referentie

### Hoe kan een gebruiker zijn gegevens exporteren?
Via Instellingen > "Gegevens exporteren". Er wordt een JSON-bestand gedownload met alle profiel- en registratiegegevens.

### Hoe verwijdert een gebruiker zijn account?
Via Instellingen > "Account verwijderen". Na het typen van "VERWIJDEREN" als bevestiging wordt het account verwijderd en de gegevens geanonimiseerd.

---

> **Laatst bijgewerkt:** 23 februari 2026
> **Gegenereerd met behulp van:** Claude Code (Anthropic)
