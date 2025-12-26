// app/api/generate-invoice-pdf/route.ts

import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

import "@/fonts/DejaVuSans-normal.js";
import "@/fonts/DejaVuSans-bold.js";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, customers(name, billing_address, email)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }
    
    const money = (v: number | null | undefined) =>
  `₱${(v ?? 0).toFixed(2)}`;

    
    // Fetch items
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);

    // Create PDF
    const doc = new jsPDF();
    doc.setFont("DejaVuSans", "normal");

    let yPos = 20;

    // ===============================
    // ADD LOGO FROM /public
    // ===============================
    try {
      const logoPath = path.join(
        process.cwd(),
        "public",
        "logo.png"
      );

      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString("base64");

        // Get image dimensions to maintain aspect ratio
        const imgData = `data:image/png;base64,${logoBase64}`;
        const imgProps = doc.getImageProperties(imgData);
        
        // Set max width for logo (in mm) - adjust as needed
        const maxLogoWidth = 50;
        const maxLogoHeight = 35;
        
        // Calculate dimensions maintaining aspect ratio
        let logoWidth = maxLogoWidth;
        let logoHeight = (imgProps.height * maxLogoWidth) / imgProps.width;
        
        // If height exceeds max, scale based on height instead
        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = (imgProps.width * maxLogoHeight) / imgProps.height;
        }

        doc.addImage(
          imgData,
          "PNG",
          20,
          15,
          logoWidth,
          logoHeight
        );

        yPos = 15 + logoHeight + 5; // Logo Y position + height + spacing
      } else {
        throw new Error("Logo not found in public/");
      }
    } catch (err) {
      console.log("Logo not added, using text fallback:", err);
      doc.setFontSize(16);
      doc.setFont("DejaVuSans", "bold");
      doc.text("YOUR COMPANY NAME", 20, yPos);
      yPos += 15;
    }

    // ===============================
    // HEADER
    // ===============================
    doc.setFontSize(24);
    doc.setFont("DejaVuSans", "bold");
    doc.text("INVOICE", 200, 20, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("DejaVuSans", "normal");
    doc.text(`Invoice #: ${invoice.invoice_no}`, 200, 30, { align: "right" });
    doc.text(
      `Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}`,
      200,
      36,
      { align: "right" }
    );
    doc.text(
      `Due Date: ${
        invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString()
          : "N/A"
      }`,
      200,
      42,
      { align: "right" }
    );

    // Company location
    if (invoice.location) {
      doc.setFontSize(9);
      doc.text(invoice.location, 20, yPos);
      yPos += 10;
    }

    // ===============================
    // BILL TO
    // ===============================
    yPos += 5;
    doc.setFontSize(11);
    doc.setFont("DejaVuSans", "bold");
    doc.text("BILL TO:", 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont("DejaVuSans", "normal");
    doc.text(invoice.customers?.name || "N/A", 20, yPos);
    yPos += 5;

    if (invoice.customers?.billing_address) {
      const addressLines = invoice.customers.billing_address.split("\n");
      addressLines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 5;
      });
    }

    // ===============================
    // TABLE HEADER
    // ===============================
    yPos += 12;
    const tableTop = yPos;

    doc.setFontSize(9);
    doc.setFont("DejaVuSans", "bold");
    doc.text("#", 15, tableTop);
    doc.text("Description", 25, tableTop);
    doc.text("Qty", 110, tableTop, { align: "right" });
    doc.text("Rate", 135, tableTop, { align: "right" });
    doc.text("Tax", 160, tableTop, { align: "right" });
    doc.text("Amount", 195, tableTop, { align: "right" });

    yPos = tableTop + 2;
    doc.line(15, yPos, 195, yPos);
    yPos += 6;

    // ===============================
    // TABLE ROWS
    // ===============================
    doc.setFont("DejaVuSans", "normal");

    items?.forEach((item: any, index: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const lineTotal =
        item.line_total || item.quantity * item.unit_price;

      doc.text(String(index + 1), 15, yPos);

      const desc = doc.splitTextToSize(
        item.description || item.product_service || "-",
        75
      );
      doc.text(desc, 25, yPos);

      doc.text(String(item.quantity), 110, yPos, { align: "right" });
      doc.text(`₱${item.unit_price.toFixed(2)}`, 135, yPos, {
        align: "right",
      });
      doc.text(`${item.tax_rate || 0}%`, 160, yPos, { align: "right" });
      doc.text(`₱${lineTotal.toFixed(2)}`, 195, yPos, {
        align: "right",
      });

      yPos += Math.max(6, desc.length * 5);
    });

    // ===============================
    // TOTALS
    // ===============================
    yPos += 5;
    doc.line(15, yPos, 195, yPos);
    yPos += 8;

    doc.text("Subtotal:", 155, yPos, { align: "right" });
    doc.text(`₱${(invoice.subtotal ?? 0).toFixed(2)}`, 195, yPos, {
      align: "right",
    });
    yPos += 6;

    doc.text("Tax Total:", 155, yPos, { align: "right" });
    doc.text(`₱${(invoice.tax_total ?? 0).toFixed(2)}`, 195, yPos, {
      align: "right",
    });
    yPos += 8;

    doc.setFont("DejaVuSans", "bold");
    doc.text("BALANCE DUE:", 155, yPos, { align: "right" });
    const balanceDue =
      invoice.balance_due ??
      invoice.total_amount ??
      0;

    doc.text(`₱${balanceDue.toFixed(2)}`, 195, yPos, {
      align: "right",
    });


    // Footer
    doc.setFontSize(8);
    doc.setFont("DejaVuSans", "normal");
    doc.text("Thank you for your business!", 105, 285, {
      align: "center",
    });

    // Output
    const pdfBlob = doc.output("blob");

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_no}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}