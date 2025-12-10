// lib/generate-invoice-pdf.ts
import jsPDF from 'jspdf';
import '@/fonts/DejaVuSans-normal.js';
import '@/fonts/DejaVuSans-bold.js';

type InvoiceItem = {
  serviceDate: string;
  productService: string;
  description: string;
  quantity: number;
  rate: number;
  tax: number;
  class: string;
};

type InvoiceData = {
  invoiceNo: string;
  customerName: string;
  billingAddress: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  note: string;
  terms: string;
  location: string;
};

export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  const doc = new jsPDF();
  let yPos = 20;
  
    doc.setFont("DejaVuSans", "normal");
  // Try to load logo if it exists
  try {
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          doc.addImage(logoImg, 'PNG', 20, 15, 30, 30);
          resolve(true);
        } catch (err) {
          console.log('Could not add logo to PDF:', err);
          resolve(false);
        }
      };
      logoImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
    
    yPos = 50;
  } catch (err) {
    doc.setFontSize(20);
    doc.setFont("DejaVuSans", "bold");
    doc.text('YOUR COMPANY NAME', 20, yPos);
    yPos += 15;
  }

  // Invoice title (top right)
  doc.setFontSize(24);
  doc.setFont("DejaVuSans", "bold");
  doc.text('INVOICE', 200, 20, { align: 'right' });

  // Invoice details (top right)
  doc.setFontSize(10);
  doc.setFont("DejaVuSans", "normal");
  doc.text(`Invoice #: ${data.invoiceNo}`, 200, 30, { align: 'right' });
  doc.text(`Issue Date: ${data.issueDate}`, 200, 36, { align: 'right' });
  doc.text(`Due Date: ${data.dueDate}`, 200, 42, { align: 'right' });

  // Company location
  doc.setFontSize(9);
  doc.text(data.location || 'Head Office - Puerto Princesa City', 20, yPos);
  yPos += 15;

  // Bill To section
  doc.setFontSize(11);
  doc.setFont("DejaVuSans", "bold");
  doc.text('BILL TO:', 20, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setFont("DejaVuSans", "normal");
  const addressLines = data.billingAddress.split('\n');
  addressLines.forEach((line) => {
    doc.text(line, 20, yPos);
    yPos += 5;
  });

  // Payment terms
  yPos += 3;
  doc.text(`Payment Terms: ${data.terms}`, 20, yPos);

  // Table header
  yPos += 12;
  const tableTop = yPos;
  
  doc.setFontSize(9);
  doc.setFont("DejaVuSans", "bold");
  doc.text('#', 15, tableTop);
  doc.text('Description', 25, tableTop);
  doc.text('Qty', 110, tableTop, { align: 'right' });
  doc.text('Rate', 135, tableTop, { align: 'right' });
  doc.text('Tax', 160, tableTop, { align: 'right' });
  doc.text('Amount', 195, tableTop, { align: 'right' });

  // Line under header
  yPos = tableTop + 2;
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 6;

  // Table rows
  doc.setFont("DejaVuSans", "normal");
  data.items.forEach((item, index) => {
    const lineAmount = item.quantity * item.rate;
    const lineTax = (lineAmount * item.tax) / 100;
    const lineTotal = lineAmount + lineTax;

    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(String(index + 1), 15, yPos);
    
    const descText = item.description || item.productService || '-';
    const splitDesc = doc.splitTextToSize(descText, 75);
    doc.text(splitDesc, 25, yPos);
    
    doc.text(String(item.quantity), 110, yPos, { align: 'right' });
    doc.text(`₱${item.rate.toFixed(2)}`, 135, yPos, { align: 'right' });
    doc.text(`${item.tax}%`, 160, yPos, { align: 'right' });
    doc.text(`₱${lineTotal.toFixed(2)}`, 195, yPos, { align: 'right' });

    yPos += Math.max(6, splitDesc.length * 5);
  });

  // Totals section
  yPos += 5;
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 8;

  doc.setFont("DejaVuSans", "normal");
  doc.text('Subtotal:', 155, yPos, { align: 'right' });
  doc.text(`₱${data.subtotal.toFixed(2)}`, 195, yPos, { align: 'right' });
  yPos += 6;

  doc.text('Tax Total:', 155, yPos, { align: 'right' });
  doc.text(`₱${data.taxTotal.toFixed(2)}`, 195, yPos, { align: 'right' });
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont("DejaVuSans", "bold");
  doc.text('BALANCE DUE:', 155, yPos, { align: 'right' });
  doc.text(`₱${data.total.toFixed(2)}`, 195, yPos, { align: 'right' });

  // Note to customer
  if (data.note) {
    yPos += 15;
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(10);
    doc.setFont("DejaVuSans", "bold");
    doc.text('Note:', 20, yPos);
    yPos += 6;
    doc.setFont("DejaVuSans", "normal");
    const noteLines = doc.splitTextToSize(data.note, 170);
    doc.text(noteLines, 20, yPos);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont("DejaVuSans", "italic");
  doc.text('Thank you for your business!', 105, 285, { align: 'center' });

  const pdfOutput = doc.output('datauristring');
  return pdfOutput.split(',')[1];
}