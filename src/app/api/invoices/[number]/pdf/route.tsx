import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice/invoice-pdf";
import { getSession } from "@/lib/session";
import { getInvoiceView } from "@/server/invoices";

export async function GET(_request: Request, ctx: RouteContext<"/api/invoices/[number]/pdf">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { number } = await ctx.params;
  if (!/^DD-\d{4}-\d{2}-\d{5,}$/.test(number)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoice = await getInvoiceView(number, session.user);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const logo = await readFile(path.join(process.cwd(), "public/brand/logo-mark.png")).catch(() => undefined);
  const pdf = await renderToBuffer(<InvoiceDocument invoice={invoice} logo={logo} />);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
