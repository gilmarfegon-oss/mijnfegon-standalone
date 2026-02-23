import PropTypes from "prop-types";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.back}>← Terug naar portaal</Link>

        <h1 style={styles.title}>Privacybeleid & Cookieverklaring</h1>
        <p style={styles.meta}>Versie: januari 2026 | Fegon Waterbehandeling B.V.</p>

        <Section title="1. Wie zijn wij?">
          <p>
            <strong>Fegon Waterbehandeling B.V.</strong><br />
            {/* TODO: vul adres, KvK-nummer en contactgegevens in */}
            Adres: [Adres invullen]<br />
            KvK-nummer: [KvK-nummer invullen]<br />
            E-mail: <a href="mailto:privacy@fegon.nl">privacy@fegon.nl</a>
          </p>
          <p>
            Wij zijn verwerkingsverantwoordelijke in de zin van de Algemene Verordening
            Gegevensbescherming (AVG / GDPR) voor de verwerking van persoonsgegevens via
            het MijnFegon-installateurportaal.
          </p>
        </Section>

        <Section title="2. Welke gegevens verzamelen wij?">
          <p>Wij verwerken de volgende categorieën persoonsgegevens:</p>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Categorie</th>
                <th style={styles.th}>Voorbeelden</th>
                <th style={styles.th}>Doel</th>
                <th style={styles.th}>Rechtsgrond (AVG Art. 6)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>Accountgegevens installateur</td>
                <td style={styles.td}>Naam, e-mail, bedrijfsnaam, KvK-nummer, adres, telefoonnummer</td>
                <td style={styles.td}>Portaaltoegang, factuurgegevens</td>
                <td style={styles.td}>Uitvoering overeenkomst (lid b)</td>
              </tr>
              <tr>
                <td style={styles.td}>Klantgegevens eindgebruiker</td>
                <td style={styles.td}>Naam, adres, e-mail, telefoonnummer, geslacht</td>
                <td style={styles.td}>Productregistratie &amp; garantieafhandeling</td>
                <td style={styles.td}>Uitvoering overeenkomst (lid b) + toestemming (lid a)</td>
              </tr>
              <tr>
                <td style={styles.td}>Productgegevens</td>
                <td style={styles.td}>Serienummer, merk, model, installatiedatum</td>
                <td style={styles.td}>Garantieregistratie</td>
                <td style={styles.td}>Uitvoering overeenkomst (lid b)</td>
              </tr>
              <tr>
                <td style={styles.td}>Technische gegevens</td>
                <td style={styles.td}>Browser-type (user-agent), tijdstip inloggen</td>
                <td style={styles.td}>Beveiliging &amp; fraudepreventie</td>
                <td style={styles.td}>Gerechtvaardigd belang (lid f)</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="3. Met wie delen wij uw gegevens?">
          <p>Wij delen gegevens uitsluitend met:</p>
          <ul style={styles.list}>
            <li>
              <strong>Google / Firebase</strong> (hosting, database, authenticatie) — verwerker —
              gegevens opgeslagen in de EU. Zie{" "}
              <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">
                Firebase privacybeleid
              </a>.
            </li>
            <li>
              <strong>Compenda</strong> (garantieregistratiesysteem) — verwerker —
              ontvangt productregistratiegegevens inclusief klant- en adresgegevens
              na expliciete goedkeuring door een beheerder. {/* TODO: voeg DPA-verwijzing toe */}
            </li>
            <li>
              <strong>Mailchimp / Intuit</strong> (e-mailcommunicatie) — verwerker —
              ontvangt e-mailadressen voor transactionele e-mails. {/* TODO: voeg DPA-verwijzing toe */}
            </li>
            <li>
              <strong>KVK (Kamer van Koophandel)</strong> — publiek register —
              het KvK-nummer wordt opgezocht in het openbare handelsregister.
            </li>
          </ul>
          <p>
            Met alle verwerkers zijn verwerkersovereenkomsten (DPA&apos;s) gesloten of wordt gebruik
            gemaakt van standaard contractbepalingen (SCC&apos;s) van de Europese Commissie.
            {/* TODO: bevestig DPA-status per verwerker */}
          </p>
        </Section>

        <Section title="4. Hoe lang bewaren wij uw gegevens?">
          <ul style={styles.list}>
            <li>Accountgegevens: zolang uw account actief is + 2 jaar na beëindiging</li>
            <li>Productregistraties: 10 jaar (wettelijke garantietermijn)</li>
            <li>Inloglogboek: 1 jaar</li>
            <li>Bestellingen: 7 jaar (fiscale bewaarplicht)</li>
          </ul>
          <p>
            Na het verstrijken van de bewaartermijn worden gegevens automatisch verwijderd of
            geanonimiseerd.
            {/* TODO: implementeer automatische verwijdering */}
          </p>
        </Section>

        <Section title="5. Uw rechten">
          <p>Op grond van de AVG heeft u de volgende rechten:</p>
          <ul style={styles.list}>
            <li><strong>Inzage (Art. 15):</strong> u kunt uw gegevens downloaden via <em>Instellingen → Download mijn gegevens</em>.</li>
            <li><strong>Rectificatie (Art. 16):</strong> u kunt uw profiel bewerken via <em>Instellingen</em>.</li>
            <li><strong>Verwijdering (Art. 17):</strong> u kunt uw account en persoonsgegevens verwijderen via <em>Instellingen → Verwijder mijn account</em>.</li>
            <li><strong>Bezwaar (Art. 21):</strong> stuur een e-mail naar <a href="mailto:privacy@fegon.nl">privacy@fegon.nl</a>.</li>
            <li><strong>Klacht indienen:</strong> u kunt een klacht indienen bij de <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer">Autoriteit Persoonsgegevens</a>.</li>
          </ul>
        </Section>

        <Section title="6. Cookies">
          <p>
            MijnFegon gebruikt uitsluitend <strong>functionele sessiecookies</strong> die noodzakelijk zijn
            voor het inlogproces via Firebase Authentication. Deze cookies bevatten een versleutelde
            sessietoken en worden verwijderd bij uitloggen of na sessie-expiratie.
          </p>
          <p>
            Er worden <strong>geen</strong> tracking-, analyse- of advertentiecookies gebruikt.
            Er is geen Google Analytics of vergelijkbare dienst actief.
          </p>
        </Section>

        <Section title="7. Beveiliging">
          <p>
            Wij nemen passende technische en organisatorische maatregelen om uw gegevens te
            beschermen, waaronder:
          </p>
          <ul style={styles.list}>
            <li>Versleutelde verbindingen (HTTPS/TLS)</li>
            <li>Authenticatie via Firebase Auth (incl. Google OAuth)</li>
            <li>Rolgebaseerde toegangscontrole (admin / gebruiker)</li>
            <li>Automatisch uitloggen na 10 minuten inactiviteit</li>
            <li>Toegangsregels op databaseniveau (Firestore Security Rules)</li>
            <li>Audit-logging van beheerderhandelingen</li>
          </ul>
        </Section>

        <Section title="8. Wijzigingen">
          <p>
            Wij kunnen dit privacybeleid bijwerken. De meest recente versie staat altijd op deze pagina.
            Bij ingrijpende wijzigingen ontvangt u een melding via e-mail of bij inloggen.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Vragen over dit privacybeleid? Neem contact op:<br />
            E-mail: <a href="mailto:privacy@fegon.nl">privacy@fegon.nl</a><br />
            {/* TODO: vul postadres in */}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ color: "#004aad", fontSize: "1.1rem", marginBottom: "0.5rem" }}>{title}</h2>
      {children}
    </section>
  );
}

Section.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7ff",
    padding: "2rem 1rem",
  },
  card: {
    maxWidth: 800,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 14,
    padding: "2rem",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    lineHeight: 1.7,
    color: "#333",
  },
  title: {
    color: "#004aad",
    fontSize: "1.6rem",
    marginBottom: "0.25rem",
  },
  meta: {
    color: "#888",
    fontSize: "0.85rem",
    marginBottom: "2rem",
  },
  back: {
    display: "inline-block",
    marginBottom: "1.5rem",
    color: "#004aad",
    textDecoration: "none",
    fontSize: "0.9rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.88rem",
    marginTop: "0.5rem",
  },
  th: {
    background: "#eef2ff",
    padding: "0.5rem 0.75rem",
    textAlign: "left",
    borderBottom: "2px solid #dbe4ff",
    fontWeight: "bold",
  },
  td: {
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
  },
  list: {
    paddingLeft: "1.25rem",
    lineHeight: 2,
  },
};
