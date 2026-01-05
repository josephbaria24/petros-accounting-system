import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

import "@/fonts/DejaVuSans-normal.js";
import "@/fonts/DejaVuSans-bold.js";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, logoBase64 } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // ✅ Supabase — Service Role (NO cookies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
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

    // Fetch items
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);

    // ===============================
    // PDF GENERATION
    // ===============================
    const doc = new jsPDF();
    doc.setFont("DejaVuSans", "normal");

    // Add watermark logo as background
    try {
      let imgData = null;
      
      // First try to use the provided base64 logo
      if (logoBase64) {
        imgData = logoBase64;
      } else {
        // Fall back to local logo file
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          imgData = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        }
      }

      if (imgData) {
        const imgProps = doc.getImageProperties(imgData);
        
        // Calculate dimensions to maintain aspect ratio
        // Make it large but centered
        const maxWidth = 150;
        let logoWidth = maxWidth;
        let logoHeight = (imgProps.height * maxWidth) / imgProps.width;
        
        // Center the watermark
        const xPos = (210 - logoWidth) / 2; // A4 width is 210mm
        const yPos = (297 - logoHeight) / 2; // A4 height is 297mm
        
        // Add with low opacity (faded effect)
        doc.saveGraphicsState();
        doc.setGState({ opacity: 0.1 });
        doc.addImage(imgData, "PNG", xPos, yPos, logoWidth, logoHeight);
        doc.restoreGraphicsState();
      }
    } catch (error) {
      console.log("Could not load watermark logo:", error);
    }

    // Invoice Header - Left aligned
    let yPos = 20;
    doc.setFontSize(28);
    doc.setFont("DejaVuSans", "bold");
    doc.text("INVOICE", 20, yPos);

    // Invoice details - Left side
    yPos += 15;
    doc.setFontSize(11);
    doc.setFont("DejaVuSans", "normal");
    doc.text(`Invoice Number: ${invoice.invoice_no}`, 20, yPos);
    
    yPos += 7;
    doc.text(`Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, 20, yPos);
    
    yPos += 7;
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, yPos);

    // Customer details
    yPos += 15;
    doc.setFont("DejaVuSans", "bold");
    doc.text("BILL TO:", 20, yPos);
    
    yPos += 7;
    doc.setFont("DejaVuSans", "normal");
    doc.text(invoice.customers?.name || "N/A", 20, yPos);
    
    if (invoice.customers?.email) {
      yPos += 6;
      doc.text(invoice.customers.email, 20, yPos);
    }
    
    if (invoice.customers?.billing_address) {
      yPos += 6;
      const addressLines = doc.splitTextToSize(invoice.customers.billing_address, 90);
      doc.text(addressLines, 20, yPos);
      yPos += (addressLines.length * 6);
    }

    // Table header
    yPos += 15;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, 180, 8, "F");
    
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(10);
    doc.text("#", 20, yPos);
    doc.text("Description", 30, yPos);
    doc.text("Qty", 120, yPos, { align: "right" });
    doc.text("Unit Price", 150, yPos, { align: "right" });
    doc.text("Amount", 190, yPos, { align: "right" });

    // Table rows
    yPos += 10;
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(9);
    
    items?.forEach((item: any, index: number) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
        
        // Repeat table header on new page
        doc.setFillColor(240, 240, 240);
        doc.rect(15, yPos - 5, 180, 8, "F");
        doc.setFont("DejaVuSans", "bold");
        doc.setFontSize(10);
        doc.text("#", 20, yPos);
        doc.text("Description", 30, yPos);
        doc.text("Qty", 120, yPos, { align: "right" });
        doc.text("Unit Price", 150, yPos, { align: "right" });
        doc.text("Amount", 190, yPos, { align: "right" });
        yPos += 10;
        doc.setFont("DejaVuSans", "normal");
        doc.setFontSize(9);
      }

      const lineTotal = item.line_total || item.quantity * item.unit_price;

      doc.text(String(index + 1), 20, yPos);
      
      // Handle long descriptions
      const descLines = doc.splitTextToSize(item.description || "-", 80);
      doc.text(descLines, 30, yPos);
      
      doc.text(String(item.quantity), 120, yPos, { align: "right" });
      doc.text(`₱${item.unit_price.toFixed(2)}`, 150, yPos, { align: "right" });
      doc.text(`₱${lineTotal.toFixed(2)}`, 190, yPos, { align: "right" });

      yPos += Math.max(7, descLines.length * 5);
    });

    // Totals
    yPos += 10;
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(10);
    
    // Subtotal
    doc.text("Subtotal:", 150, yPos);
    doc.text(`₱${Number(invoice.subtotal || 0).toFixed(2)}`, 190, yPos, { align: "right" });
    
    // Tax if applicable
    if (invoice.tax_amount && invoice.tax_amount > 0) {
      yPos += 7;
      doc.setFont("DejaVuSans", "normal");
      doc.text(`Tax (${invoice.tax_rate || 0}%):`, 150, yPos);
      doc.text(`₱${Number(invoice.tax_amount).toFixed(2)}`, 190, yPos, { align: "right" });
    }
    
    // Discount if applicable
    if (invoice.discount_amount && invoice.discount_amount > 0) {
      yPos += 7;
      doc.setFont("DejaVuSans", "normal");
      doc.text("Discount:", 150, yPos);
      doc.text(`-₱${Number(invoice.discount_amount).toFixed(2)}`, 190, yPos, { align: "right" });
    }
    
    // Total
    yPos += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(145, yPos - 6, 50, 10, "F");
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", 150, yPos);
    doc.text(`₱${Number(invoice.total_amount).toFixed(2)}`, 190, yPos, { align: "right" });

    // Footer - Add to every page
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 270, 190, 270);
      
      // Footer content
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      doc.text("Generated by PETROBOOK", 105, 277, { align: "center" });
      
      doc.setFontSize(9);
      doc.setFont("DejaVuSans", "bold");
      doc.text("Need Help?", 20, 280);
      
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(8);
      doc.text("Phone: Globe/TM 0917-708-7994", 20, 285);
      doc.text("Email: info@petrosphere.com.ph", 20, 290);
      doc.text("Office Hours: Monday - Friday, 8:00 AM - 5:00 PM", 20, 295);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
    }

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