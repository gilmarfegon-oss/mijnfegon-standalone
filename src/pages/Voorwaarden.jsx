import PropTypes from "prop-types";
import { Link } from "react-router-dom";

export default function Voorwaarden() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.back}>← Terug naar portaal</Link>

        <h1 style={styles.title}>Algemene Voorwaarden MijnFegon</h1>
        <p style={styles.meta}>Versie: januari 2026 | Fegon Waterbehandeling B.V.</p>

        {/* TODO: vervang onderstaande secties door de definitieve juridische tekst */}

        <Section title="1. Definities">
          <ul style={styles.list}>
            <li><strong>Fegon:</strong> Fegon Waterbehandeling B.V., gevestigd te [Plaats], ingeschreven in het Handelsregister onder KvK-nummer [nummer].</li>
            <li><strong>MijnFegon:</strong> het online installateurportaal bereikbaar via mijnfegon.web.app.</li>
            <li><strong>Installateur:</strong> de rechtspersoon of natuurlijke persoon die een account aanmaakt en producten registreert via MijnFegon.</li>
          </ul>
        </Section>

        <Section title="2. Toepasselijkheid">
          <p>
            Deze voorwaarden zijn van toepassing op het gebruik van het MijnFegon-portaal. Door een
            account aan te maken en in te loggen, verklaart de installateur zich akkoord met deze
            voorwaarden.
          </p>
        </Section>

        <Section title="3. Toegang en account">
          <ul style={styles.list}>
            <li>De installateur is verantwoordelijk voor de beveiliging van zijn inloggegevens.</li>
            <li>Fegon behoudt het recht om accounts te blokkeren of te verwijderen bij misbruik.</li>
            <li>Het account is strikt persoonlijk en niet overdraagbaar.</li>
          </ul>
        </Section>

        <Section title="4. Productregistraties">
          <ul style={styles.list}>
            <li>De installateur garandeert dat alle ingevoerde gegevens juist en volledig zijn.</li>
            <li>De installateur heeft toestemming verkregen van de eindklant om diens persoonsgegevens in te voeren (zie ook ons <Link to="/privacy" style={styles.inlineLink}>privacybeleid</Link>).</li>
            <li>Onjuiste registraties kunnen leiden tot ongeldigheid van garantieclaims.</li>
          </ul>
        </Section>

        <Section title="5. Punten en beloningen">
          <ul style={styles.list}>
            <li>Verdiende punten (Drops) hebben geen monetaire waarde en zijn niet inwisselbaar voor geld.</li>
            <li>Fegon behoudt het recht om het puntensysteem te wijzigen of te beëindigen.</li>
            <li>Punten vervallen bij verwijdering van het account.</li>
          </ul>
        </Section>

        <Section title="6. Aansprakelijkheid">
          <p>
            Fegon is niet aansprakelijk voor schade die voortvloeit uit onjuist gebruik van het portaal,
            onjuiste invoer van gegevens door de installateur, of tijdelijke onbeschikbaarheid van het systeem.
          </p>
        </Section>

        <Section title="7. Intellectueel eigendom">
          <p>
            Alle rechten op het MijnFegon-portaal, inclusief software, teksten en afbeeldingen,
            berusten bij Fegon Waterbehandeling B.V. Het is niet toegestaan deze zonder schriftelijke
            toestemming te kopiëren of openbaar te maken.
          </p>
        </Section>

        <Section title="8. Wijzigingen">
          <p>
            Fegon kan deze voorwaarden op elk moment wijzigen. De meest actuele versie staat
            altijd op deze pagina. Voortgezet gebruik van het portaal na publicatie van gewijzigde
            voorwaarden geldt als aanvaarding.
          </p>
        </Section>

        <Section title="9. Toepasselijk recht">
          <p>
            Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan
            de bevoegde rechter in het arrondissement [Arrondissement invullen].
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Vragen over deze voorwaarden? Neem contact op via{" "}
            <a href="mailto:info@fegon.nl" style={styles.inlineLink}>info@fegon.nl</a>.
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
  inlineLink: {
    color: "#004aad",
  },
  list: {
    paddingLeft: "1.25rem",
    lineHeight: 2,
  },
};
