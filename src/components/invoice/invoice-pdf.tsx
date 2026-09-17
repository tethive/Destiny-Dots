import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type InvoiceView = {
  number: string;
  kind: "BILL_OF_SUPPLY" | "TAX_INVOICE";
  status: "PAID" | "REFUNDED";
  issuedAt: Date;
  description: string;
  billingName: string;
  billingEmail: string;
  subtotalInr: number;
  discountInr: number;
  taxInr: number;
  totalInr: number;
  sellerGstin: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  razorpayPaymentId: string | null;
  isSimulated: boolean;
  business: { legalName: string; address: string; state: string; email: string; phone: string; pan: string };
};

// Helvetica has no ₹ glyph, so PDFs use "Rs."
const inr = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;
const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const ink = "#1c1830";
const muted = "#6b6880";
const line = "#e4e1ee";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: ink, lineHeight: 1.45 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  logo: { width: 28, height: 28, marginRight: 8 },
  accent: { color: "#5b3fd6" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "right" },
  muted: { color: muted },
  label: { color: muted, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  box: { marginTop: 28, flexDirection: "row", gap: 24 },
  col: { flex: 1 },
  table: { marginTop: 28, borderTopWidth: 1, borderTopColor: line },
  th: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: line, color: muted, fontSize: 8, textTransform: "uppercase" },
  td: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: line },
  totals: { marginTop: 14, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: ink, fontFamily: "Helvetica-Bold", fontSize: 12 },
  stamp: { marginTop: 18, alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4, fontSize: 9, fontFamily: "Helvetica-Bold" },
  note: { marginTop: 30, fontSize: 8.5, color: muted },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7.5, color: "#a19db3", textAlign: "center" },
});

export function InvoiceDocument({ invoice: i, logo }: { invoice: InvoiceView; logo?: Buffer }) {
  const heading = i.kind === "TAX_INVOICE" ? "Tax Invoice" : "Bill of Supply";
  return (
    <Document title={`${heading} ${i.number}`} author={i.business.legalName}>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View>
            <View style={s.brandRow}>
              {logo ? <PdfImage src={{ data: logo, format: "png" }} style={s.logo} /> : <Text style={s.accent}>● </Text>}
              <Text style={s.brand}>{i.business.legalName}</Text>
            </View>
            <Text style={s.muted}>{i.business.address}</Text>
            <Text style={s.muted}>
              {i.business.email} · {i.business.phone}
            </Text>
            {i.sellerGstin && <Text style={s.muted}>GSTIN: {i.sellerGstin}</Text>}
            {i.business.pan && <Text style={s.muted}>PAN: {i.business.pan}</Text>}
          </View>
          <View>
            <Text style={s.title}>{heading}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>{i.number}</Text>
          </View>
        </View>

        <View style={s.box}>
          <View style={s.col}>
            <Text style={s.label}>Billed to</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{i.billingName}</Text>
            <Text style={s.muted}>{i.billingEmail}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Invoice date</Text>
            <Text>{day(i.issuedAt)}</Text>
            {i.periodEnd && (
              <>
                <Text style={[s.label, { marginTop: 8 }]}>Service period</Text>
                <Text>
                  {i.periodStart ? `${day(i.periodStart)} – ` : "Until "}
                  {day(i.periodEnd)}
                </Text>
              </>
            )}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Payment</Text>
            <Text>{i.isSimulated ? "Test payment (simulated)" : "Razorpay"}</Text>
            {i.razorpayPaymentId && <Text style={s.muted}>{i.razorpayPaymentId}</Text>}
            <Text style={[s.label, { marginTop: 8 }]}>Place of supply</Text>
            <Text>{i.business.state}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={{ flex: 1 }}>Description</Text>
            <Text style={{ width: 60, textAlign: "center" }}>SAC</Text>
            <Text style={{ width: 90, textAlign: "right" }}>Amount</Text>
          </View>
          <View style={s.td}>
            <Text style={{ flex: 1 }}>{i.description}</Text>
            <Text style={{ width: 60, textAlign: "center" }}>999293</Text>
            <Text style={{ width: 90, textAlign: "right" }}>{inr(i.subtotalInr)}</Text>
          </View>
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{inr(i.subtotalInr)}</Text>
          </View>
          {i.discountInr > 0 && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Discount</Text>
              <Text>- {inr(i.discountInr)}</Text>
            </View>
          )}
          {i.kind === "TAX_INVOICE" && (
            <View style={s.totalRow}>
              <Text style={s.muted}>GST 18% (included)</Text>
              <Text>{inr(i.taxInr)}</Text>
            </View>
          )}
          <View style={s.grand}>
            <Text>Total paid</Text>
            <Text>{inr(i.totalInr)}</Text>
          </View>
        </View>

        <Text style={[s.stamp, i.status === "REFUNDED" ? { backgroundColor: "#fdecec", color: "#b42318" } : { backgroundColor: "#e8f7ee", color: "#127a3a" }]}>
          {i.status === "REFUNDED" ? "REFUNDED" : "PAID"}
        </Text>

        <Text style={s.note}>
          {i.kind === "BILL_OF_SUPPLY"
            ? "Supplier not registered under GST; no tax has been charged. "
            : "Amounts are inclusive of GST. "}
          This is a computer-generated document and does not require a signature.
        </Text>
        <Text style={s.footer}>
          {i.business.legalName} · {i.business.email}
        </Text>
      </Page>
    </Document>
  );
}
