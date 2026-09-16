import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { bullets, type ResumeData } from "./types";

const ink = "#1c1830";
const muted = "#5f5b72";
const accent = "#5b3fd6";

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: ink, lineHeight: 1.45 },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 11, color: accent, marginTop: 2 },
  contact: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, color: muted, fontSize: 9 },
  contactItem: { marginRight: 10 },
  section: { marginTop: 14 },
  heading: { fontSize: 10, fontFamily: "Helvetica-Bold", color: accent, letterSpacing: 1, textTransform: "uppercase", borderBottomWidth: 0.75, borderBottomColor: "#e4e1ee", paddingBottom: 3, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  small: { color: muted, fontSize: 9 },
  bullet: { flexDirection: "row", marginTop: 1.5 },
  dot: { width: 10 },
  item: { marginBottom: 7 },
  skills: { flexDirection: "row", flexWrap: "wrap" },
  skill: { marginRight: 6, marginBottom: 4, paddingVertical: 1.5, paddingHorizontal: 5, backgroundColor: "#f1eefb", borderRadius: 3, fontSize: 8.5 },
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, fontSize: 7, color: "#a19db3", textAlign: "center" },
});

const dates = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");

export function ResumeDocument({ data }: { data: ResumeData }) {
  const p = data.personal;
  return (
    <Document title={`${p.fullName || "Resume"} — Resume`} author={p.fullName} creator="Destiny Dots">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{p.fullName || "Your Name"}</Text>
        {p.title ? <Text style={s.title}>{p.title}</Text> : null}
        <View style={s.contact}>
          {[p.email, p.phone, p.location].filter(Boolean).map((c) => (
            <Text key={c} style={s.contactItem}>
              {c}
            </Text>
          ))}
          {p.links.filter((l) => l.url).map((l) => (
            <Link key={l.url} src={l.url} style={[s.contactItem, { color: accent, textDecoration: "none" }]}>
              {l.label || l.url}
            </Link>
          ))}
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
                <View style={s.row}>
                  <Text style={s.bold}>
                    {e.role}
                    {e.company ? ` · ${e.company}` : ""}
                  </Text>
                  <Text style={s.small}>{dates(e.start, e.end)}</Text>
                </View>
                {e.location ? <Text style={s.small}>{e.location}</Text> : null}
                {bullets(e.bullets).map((b, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.dot}>•</Text>
                    <Text style={{ flex: 1 }}>{b}</Text>
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
                <View style={s.row}>
                  <Text style={s.bold}>{pr.name}</Text>
                  {pr.link ? (
                    <Link src={pr.link} style={[s.small, { color: accent, textDecoration: "none" }]}>
                      {pr.link.replace(/^https?:\/\//, "")}
                    </Link>
                  ) : null}
                </View>
                {pr.description ? <Text>{pr.description}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {data.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>Education</Text>
            {data.education.map((ed, i) => (
              <View key={i} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.bold}>{ed.degree}</Text>
                  <Text style={s.small}>{dates(ed.start, ed.end)}</Text>
                </View>
                <Text style={s.small}>{[ed.school, ed.score].filter(Boolean).join(" · ")}</Text>
              </View>
            ))}
          </View>
        )}

        {data.skills.length > 0 && (
          <View style={s.section}>
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
              <View key={i} style={s.row}>
                <Text>
                  <Text style={s.bold}>{c.name}</Text>
                  {c.issuer ? ` · ${c.issuer}` : ""}
                </Text>
                <Text style={s.small}>{c.year}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer} fixed>
          Built with Destiny Dots
        </Text>
      </Page>
    </Document>
  );
}
