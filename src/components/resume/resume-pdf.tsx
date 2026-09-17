import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { bullets, type ResumeData } from "./types";

const ink = "#1c1830";
const muted = "#5f5b72";
const accent = "#5b3fd6";
const rule = "#e4e1ee";

const s = StyleSheet.create({
  page: { paddingTop: 38, paddingBottom: 48, paddingHorizontal: 42, fontFamily: "Helvetica", fontSize: 9.5, color: ink, lineHeight: 1.4 },

  // Header — explicit line heights so the name and title never overlap.
  name: { fontSize: 21, fontFamily: "Helvetica-Bold", lineHeight: 1.15 },
  title: { fontSize: 11, color: accent, lineHeight: 1.3, marginTop: 3 },
  contact: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 7, color: muted, fontSize: 9 },
  contactItem: { lineHeight: 1.3 },
  contactSep: { marginHorizontal: 6, color: "#b9b5c8", lineHeight: 1.3 },

  section: { marginTop: 14 },
  heading: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: rule,
    paddingBottom: 3,
    marginBottom: 7,
  },

  // Two-column rows: the left side wraps, the right side (dates, year, link) keeps its width.
  row: { flexDirection: "row", alignItems: "flex-start" },
  rowMain: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 12 },
  rowSide: { flexShrink: 0, textAlign: "right", color: muted, fontSize: 9, lineHeight: 1.4, paddingTop: 0.5 },

  bold: { fontFamily: "Helvetica-Bold" },
  small: { color: muted, fontSize: 9, marginTop: 1 },
  link: { color: accent, textDecoration: "none" },

  item: { marginBottom: 8 },
  bullet: { flexDirection: "row", alignItems: "flex-start", marginTop: 2 },
  dot: { width: 11, color: accent },
  bulletText: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },

  skills: { flexDirection: "row", flexWrap: "wrap", marginTop: 1 },
  skill: {
    marginRight: 5,
    marginBottom: 5,
    paddingTop: 2.5,
    paddingBottom: 2,
    paddingHorizontal: 6,
    backgroundColor: "#f1eefb",
    borderRadius: 3,
    fontSize: 8.5,
    lineHeight: 1.2,
  },

  certRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3 },

  footer: { position: "absolute", bottom: 20, left: 42, right: 42, fontSize: 7, color: "#a19db3", textAlign: "center" },
});

const dates = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");

/** Title on the left (wraps), meta on the right (never overlaps). */
function Row({ main, side }: { main: React.ReactNode; side?: React.ReactNode }) {
  return (
    <View style={s.row}>
      <View style={s.rowMain}>{main}</View>
      {side ? <View style={{ flexShrink: 0, maxWidth: "42%" }}>{side}</View> : null}
    </View>
  );
}

export function ResumeDocument({ data }: { data: ResumeData }) {
  const p = data.personal;
  const contacts = [p.email, p.phone, p.location].filter(Boolean);
  const links = p.links.filter((l) => l.url);

  return (
    <Document title={`${p.fullName || "Resume"} — Resume`} author={p.fullName} creator="Destiny Dots">
      <Page size="A4" style={s.page}>
        <View>
          <Text style={s.name}>{p.fullName || "Your Name"}</Text>
          {p.title ? <Text style={s.title}>{p.title}</Text> : null}
          {contacts.length + links.length > 0 && (
            <View style={s.contact}>
              {contacts.map((c, i) => (
                <View key={c} style={{ flexDirection: "row" }}>
                  {i > 0 && <Text style={s.contactSep}>|</Text>}
                  <Text style={s.contactItem}>{c}</Text>
                </View>
              ))}
              {links.map((l, i) => (
                <View key={l.url} style={{ flexDirection: "row" }}>
                  {(contacts.length > 0 || i > 0) && <Text style={s.contactSep}>|</Text>}
                  <Link src={l.url} style={[s.contactItem, s.link]}>
                    {l.label || l.url.replace(/^https?:\/\//, "")}
                  </Link>
                </View>
              ))}
            </View>
          )}
        </View>

        {p.summary ? (
          <View style={s.section}>
            <Text style={s.heading}>Summary</Text>
            <Text>{p.summary}</Text>
          </View>
        ) : null}

        {data.experience.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>Experience</Text>
            {data.experience.map((e, i) => (
              <View key={i} style={s.item} wrap={false}>
                <Row
                  main={
                    <Text>
                      <Text style={s.bold}>{e.role}</Text>
                      {e.company ? <Text>{`  ·  ${e.company}`}</Text> : null}
                    </Text>
                  }
                  side={<Text style={s.rowSide}>{dates(e.start, e.end)}</Text>}
                />
                {e.location ? <Text style={s.small}>{e.location}</Text> : null}
                {bullets(e.bullets).map((b, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {data.projects.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>Projects</Text>
            {data.projects.map((pr, i) => (
              <View key={i} style={s.item} wrap={false}>
                <Text style={s.bold}>{pr.name}</Text>
                {pr.link ? (
                  <Link src={pr.link} style={[s.small, s.link]}>
                    {pr.link.replace(/^https?:\/\//, "")}
                  </Link>
                ) : null}
                {pr.description ? <Text style={{ marginTop: 2 }}>{pr.description}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {data.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>Education</Text>
            {data.education.map((ed, i) => (
              <View key={i} style={s.item} wrap={false}>
                <Row main={<Text style={s.bold}>{ed.degree}</Text>} side={<Text style={s.rowSide}>{dates(ed.start, ed.end)}</Text>} />
                {ed.school || ed.score ? <Text style={s.small}>{[ed.school, ed.score].filter(Boolean).join("  ·  ")}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {data.skills.length > 0 && (
          <View style={s.section} wrap={false}>
            <Text style={s.heading}>Skills</Text>
            <View style={s.skills}>
              {data.skills.map((sk) => (
                <Text key={sk} style={s.skill}>
                  {sk}
                </Text>
              ))}
            </View>
          </View>
        )}

        {data.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>Certifications</Text>
            {data.certifications.map((c, i) => (
              <View key={i} style={s.certRow} wrap={false}>
                <View style={s.rowMain}>
                  <Text>
                    <Text style={s.bold}>{c.name}</Text>
                    {c.issuer ? <Text style={{ color: muted }}>{`  ·  ${c.issuer}`}</Text> : null}
                  </Text>
                </View>
                {c.year ? <Text style={s.rowSide}>{c.year}</Text> : null}
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer} fixed>
          Built with Destiny Dots · destinydots.com
        </Text>
      </Page>
    </Document>
  );
}
