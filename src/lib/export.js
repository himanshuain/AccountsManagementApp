import { format } from "date-fns";
import jsPDF from "jspdf";

/**
 * Export full database backup as JSON file
 * Fetches all data from the backup API and triggers download
 */
export async function exportFullBackup() {
  try {
    const response = await fetch("/api/backup?format=download");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create backup");
    }

    // Get the blob from response
    const blob = await response.blob();
    const filename = `shop-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error("Backup export failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get backup summary without downloading
 */
export async function getBackupSummary() {
  try {
    const response = await fetch("/api/backup");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get backup summary");
    }

    return await response.json();
  } catch (error) {
    console.error("Backup summary failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore data from a backup file
 * @param {Object} backup - The parsed backup JSON
 */
export async function restoreFromBackup(backup) {
  try {
    const response = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backup }),
    });

    return await response.json();
  } catch (error) {
    console.error("Backup restore failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  // Create header row
  const headers = columns.map(col => col.label).join(",");

  // Create data rows
  const rows = data.map(item => {
    return columns
      .map(col => {
        let value = col.getValue ? col.getValue(item) : item[col.key];

        // Handle null/undefined
        if (value === null || value === undefined) {
          value = "";
        }

        // Escape quotes and wrap in quotes if contains comma
        value = String(value);
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      })
      .join(",");
  });

  // Combine header and rows
  const csv = [headers, ...rows].join("\n");

  // Create and trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export suppliers to CSV
 */
export function exportSuppliers(suppliers) {
  const columns = [
    { key: "name", label: "Name" },
    { key: "companyName", label: "Company" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "gstNumber", label: "GST Number" },
    { key: "upiId", label: "UPI ID" },
    {
      key: "bankName",
      label: "Bank Name",
      getValue: item => item.bankDetails?.bankName || "",
    },
    {
      key: "accountNumber",
      label: "Account Number",
      getValue: item => item.bankDetails?.accountNumber || "",
    },
    {
      key: "ifscCode",
      label: "IFSC Code",
      getValue: item => item.bankDetails?.ifscCode || "",
    },
    {
      key: "category",
      label: "Category",
      getValue: item => item.category || "",
    },
    {
      key: "createdAt",
      label: "Created At",
      getValue: item => (item.createdAt ? format(new Date(item.createdAt), "yyyy-MM-dd") : ""),
    },
  ];

  exportToCSV(suppliers, "suppliers", columns);
}

/**
 * Export transactions to CSV
 */
export function exportTransactions(transactions, suppliers) {
  const getSupplierName = supplierId => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.name || "Unknown";
  };

  const columns = [
    {
      key: "date",
      label: "Date",
      getValue: item => (item.date ? format(new Date(item.date), "yyyy-MM-dd") : ""),
    },
    {
      key: "supplier",
      label: "Supplier",
      getValue: item => getSupplierName(item.supplierId),
    },
    { key: "amount", label: "Amount" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "paymentMode", label: "Payment Mode" },
    {
      key: "items",
      label: "Items",
      getValue: item => {
        if (!item.items || !Array.isArray(item.items)) return "";
        return item.items.map(i => `${i.name || "Item"} (${i.quantity}x${i.rate})`).join("; ");
      },
    },
    {
      key: "dueDate",
      label: "Due Date",
      getValue: item => (item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : ""),
    },
    { key: "notes", label: "Notes" },
    {
      key: "billImages",
      label: "Bill Count",
      getValue: item => item.billImages?.length || 0,
    },
  ];

  exportToCSV(transactions, "transactions", columns);
}

/**
 * Export report summary to CSV
 */
export function exportReport(data, title) {
  const columns = Object.keys(data[0] || {}).map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
  }));

  exportToCSV(data, title, columns);
}

/**
 * Export supplier transactions to PDF with beautiful visuals
 */
export function exportSupplierTransactionsPDF(supplier, transactions, options) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Colors
  const primaryColor = [59, 130, 246]; // Blue
  const successColor = [34, 197, 94]; // Green
  const warningColor = [245, 158, 11]; // Amber
  const textColor = [30, 41, 59]; // Slate-800
  const mutedColor = [100, 116, 139]; // Slate-500

  // Helper to format currency (using Rs. for PDF compatibility)
  const formatCurrency = amount => `Rs. ${Number(amount).toLocaleString("en-IN")}`;

  // Helper function to add new page if needed
  const checkPageBreak = neededHeight => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Transaction Report", margin, 25);

  // Supplier name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Vardhman Saree Centre", margin, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Ganesh Bazaar, Narwar (473880), Madhya Pradesh", margin, 45);

  // Date on right
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(), "dd MMM yyyy"), pageWidth - margin, 40, { align: "right" });

  y = 60;

  // Supplier Info Card
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 45, 3, 3, "F");

  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Supplier Details", margin + 8, y + 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);

  let infoY = y + 22;
  if (supplier.companyName) {
    doc.text(`Company: ${supplier.companyName}`, margin + 8, infoY);
    infoY += 7;
  }
  if (supplier.phone) {
    doc.text(`Phone: ${supplier.phone}`, margin + 8, infoY);
    infoY += 7;
  }
  if (supplier.address) {
    doc.text(`Address: ${supplier.address}`, margin + 8, infoY);
  }

  y += 55;

  // Calculate totals
  const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const paidAmount = transactions.reduce((sum, t) => {
    if (t.paymentStatus === "paid") return sum + (Number(t.amount) || 0);
    if (t.paymentStatus === "partial") return sum + (Number(t.paidAmount) || 0);
    return sum;
  }, 0);
  const pendingAmount = totalAmount - paidAmount;

  // Stats Cards
  const cardWidth = (pageWidth - 2 * margin - 20) / 3;

  // Total Card
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(margin, y, cardWidth, 35, 3, 3, "F");
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.text("Total Amount", margin + cardWidth / 2, y + 12, { align: "center" });
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalAmount), margin + cardWidth / 2, y + 26, {
    align: "center",
  });

  // Paid Card
  doc.setFillColor(220, 252, 231); // Green-100
  doc.roundedRect(margin + cardWidth + 10, y, cardWidth, 35, 3, 3, "F");
  doc.setTextColor(...successColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Paid", margin + cardWidth + 10 + cardWidth / 2, y + 12, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(paidAmount), margin + cardWidth + 10 + cardWidth / 2, y + 26, {
    align: "center",
  });

  // Pending Card
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.roundedRect(margin + 2 * cardWidth + 20, y, cardWidth, 35, 3, 3, "F");
  doc.setTextColor(...warningColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Pending", margin + 2 * cardWidth + 20 + cardWidth / 2, y + 12, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(pendingAmount), margin + 2 * cardWidth + 20 + cardWidth / 2, y + 26, {
    align: "center",
  });

  y += 50;

  // Transactions Table Header
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Transactions", margin, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text(`(${transactions.length} total)`, margin + 33, y);

  y += 12;

  // Table Header
  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, pageWidth - 2 * margin, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const colWidths = [35, 50, 35, 35, 25];
  const colX = [margin + 5, margin + 40, margin + 90, margin + 125, margin + 150];

  doc.text("Date", colX[0], y + 7);
  doc.text("Amount", colX[1], y + 7);
  doc.text("Paid", colX[2], y + 7);
  doc.text("Pending", colX[3], y + 7);
  doc.text("Status", colX[4], y + 7);

  y += 10;

  // Table Rows
  doc.setFont("helvetica", "normal");
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedTransactions.forEach((transaction, index) => {
    checkPageBreak(15);

    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 12, "F");
    }

    const amount = Number(transaction.amount) || 0;
    const paid =
      transaction.paymentStatus === "paid" ? amount : Number(transaction.paidAmount) || 0;
    const pending = amount - paid;
    const status =
      transaction.paymentStatus === "paid"
        ? "Fully Paid"
        : transaction.paymentStatus === "partial"
          ? "Partially Paid"
          : "Total Pending";

    doc.setTextColor(...textColor);
    doc.setFontSize(9);

    // Date
    doc.text(
      transaction.date ? format(new Date(transaction.date), "dd/MM/yyyy") : "-",
      colX[0],
      y + 8
    );

    // Amount
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(amount), colX[1], y + 8);

    // Paid
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...successColor);
    doc.text(formatCurrency(paid), colX[2], y + 8);

    // Pending
    doc.setTextColor(...warningColor);
    doc.text(formatCurrency(pending), colX[3], y + 8);

    // Status badge
    if (status === "Paid") {
      doc.setFillColor(...successColor);
      doc.setTextColor(255, 255, 255);
    } else if (status === "Partial") {
      doc.setFillColor(59, 130, 246);
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(...warningColor);
      doc.setTextColor(255, 255, 255);
    }
    doc.roundedRect(colX[4] - 2, y + 2, 25, 8, 2, 2, "F");
    doc.setFontSize(7);
    doc.text(status, colX[4] + 10, y + 7.5, { align: "center" });

    y += 12;
  });

  // Payment History Section (if any transactions have payments)
  const transactionsWithPayments = transactions.filter(t => t.payments && t.payments.length > 0);

  if (transactionsWithPayments.length > 0) {
    y += 10;
    checkPageBreak(30);

    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Payment History", margin, y);
    y += 10;

    transactionsWithPayments.forEach(transaction => {
      checkPageBreak(20);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, "F");
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatCurrency(transaction.amount || 0)} Bill of ${transaction.date ? format(new Date(transaction.date), "dd/MM/yyyy") : "-"}`,
        margin + 5,
        y + 5.5
      );
      y += 12;

      (transaction.payments || []).forEach((payment, idx) => {
        checkPageBreak(10);

        doc.setTextColor(...successColor);
        doc.setFontSize(9);
        doc.text(`- ${formatCurrency(payment.amount || 0)}`, margin + 10, y);
        doc.setTextColor(...mutedColor);
        doc.text(payment.date ? format(new Date(payment.date), "dd/MM/yyyy") : "-", margin + 55, y);
        if (payment.isFinalPayment) {
          doc.setTextColor(...successColor);
          doc.text("(Final)", margin + 95, y);
        }
        y += 8;
      });

      y += 5;
    });
  }

  // Footer
  const footerY = pageHeight - 10;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageWidth / 2, footerY, {
    align: "center",
  });

  const filename = `${supplier.companyName || supplier.name || "supplier"}_transactions_${format(new Date(), "yyyy-MM-dd")}.pdf`;

  if (options?.asBlob) {
    return { blob: doc.output("blob"), filename };
  }

  doc.save(filename);
  return filename;
}

/**
 * Export customer (udhar) transactions to PDF
 */
export function exportCustomerTransactionsPDF(customer, udhars, options) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const primaryColor = [139, 92, 246]; // Purple
  const successColor = [34, 197, 94];
  const warningColor = [245, 158, 11];
  const textColor = [30, 41, 59];
  const mutedColor = [100, 116, 139];

  const formatCurrency = amount => `Rs. ${Number(amount).toLocaleString("en-IN")}`;

  const checkPageBreak = neededHeight => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Report", margin, 25);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Vardhman Saree Centre", margin, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Ganesh Bazaar, Narwar (473880), Madhya Pradesh", margin, 45);

  doc.setFontSize(10);
  doc.text(format(new Date(), "dd MMM yyyy"), pageWidth - margin, 40, { align: "right" });

  y = 60;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 3, 3, "F");

  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Details", margin + 8, y + 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);

  let infoY = y + 22;
  doc.text(`Name: ${customer.name || "Unknown"}`, margin + 8, infoY);
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, margin + 90, infoY);
  }

  y += 40;

  const totalAmount = udhars.reduce(
    (sum, u) => sum + (Number(u.amount) || (Number(u.cashAmount) || 0) + (Number(u.onlineAmount) || 0)),
    0
  );
  const paidAmount = udhars.reduce((sum, u) => {
    return sum + (Number(u.paidAmount) || (Number(u.paidCash) || 0) + (Number(u.paidOnline) || 0));
  }, 0);
  const pendingAmount = totalAmount - paidAmount;

  const cardWidth = (pageWidth - 2 * margin - 20) / 3;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, cardWidth, 35, 3, 3, "F");
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Total Amount", margin + cardWidth / 2, y + 12, { align: "center" });
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalAmount), margin + cardWidth / 2, y + 26, { align: "center" });

  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin + cardWidth + 10, y, cardWidth, 35, 3, 3, "F");
  doc.setTextColor(...successColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Paid", margin + cardWidth + 10 + cardWidth / 2, y + 12, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(paidAmount), margin + cardWidth + 10 + cardWidth / 2, y + 26, { align: "center" });

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin + 2 * cardWidth + 20, y, cardWidth, 35, 3, 3, "F");
  doc.setTextColor(...warningColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Pending", margin + 2 * cardWidth + 20 + cardWidth / 2, y + 12, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(pendingAmount), margin + 2 * cardWidth + 20 + cardWidth / 2, y + 26, { align: "center" });

  y += 50;

  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Udhar Records", margin, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text(`(${udhars.length} total)`, margin + 35, y);

  y += 12;

  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, pageWidth - 2 * margin, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const colX = [margin + 5, margin + 40, margin + 90, margin + 125, margin + 150];

  doc.text("Date", colX[0], y + 7);
  doc.text("Amount", colX[1], y + 7);
  doc.text("Paid", colX[2], y + 7);
  doc.text("Pending", colX[3], y + 7);
  doc.text("Status", colX[4], y + 7);

  y += 10;

  doc.setFont("helvetica", "normal");
  const sorted = [...udhars].sort((a, b) => new Date(a.date) - new Date(b.date));

  sorted.forEach((record, index) => {
    checkPageBreak(15);

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 12, "F");
    }

    const amount = Number(record.amount) || (Number(record.cashAmount) || 0) + (Number(record.onlineAmount) || 0);
    const paid = Number(record.paidAmount) || (Number(record.paidCash) || 0) + (Number(record.paidOnline) || 0);
    const pending = amount - paid;
    const status =
      record.paymentStatus === "paid"
        ? "Fully Paid"
        : record.paymentStatus === "partial"
          ? "Partially Paid"
          : "Total Pending";

    doc.setTextColor(...textColor);
    doc.setFontSize(9);

    doc.text(
      record.date ? format(new Date(record.date), "dd/MM/yyyy") : "-",
      colX[0],
      y + 8
    );

    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(amount), colX[1], y + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...successColor);
    doc.text(formatCurrency(paid), colX[2], y + 8);

    doc.setTextColor(...warningColor);
    doc.text(formatCurrency(pending), colX[3], y + 8);

    if (status === "Fully Paid") {
      doc.setFillColor(...successColor);
    } else if (status === "Partially Paid") {
      doc.setFillColor(59, 130, 246);
    } else {
      doc.setFillColor(...warningColor);
    }
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(colX[4] - 2, y + 2, 25, 8, 2, 2, "F");
    doc.setFontSize(7);
    doc.text(status, colX[4] + 10, y + 7.5, { align: "center" });

    y += 12;
  });

  const transactionsWithPayments = udhars.filter(u => u.payments && u.payments.length > 0);

  if (transactionsWithPayments.length > 0) {
    y += 10;
    checkPageBreak(30);

    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Payment History", margin, y);
    y += 10;

    transactionsWithPayments.forEach(record => {
      checkPageBreak(20);

      const amount = Number(record.amount) || (Number(record.cashAmount) || 0) + (Number(record.onlineAmount) || 0);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, "F");
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatCurrency(amount)} Udhar of ${record.date ? format(new Date(record.date), "dd/MM/yyyy") : "-"}`,
        margin + 5,
        y + 5.5
      );
      y += 12;

      (record.payments || []).forEach(payment => {
        checkPageBreak(10);

        doc.setTextColor(...successColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`- ${formatCurrency(payment.amount || 0)}`, margin + 10, y);
        doc.setTextColor(...mutedColor);
        doc.text(payment.date ? format(new Date(payment.date), "dd/MM/yyyy") : "-", margin + 55, y);
        if (payment.isFinalPayment) {
          doc.setTextColor(...successColor);
          doc.text("(Final)", margin + 95, y);
        }
        if (payment.isReturn) {
          doc.setTextColor(239, 68, 68);
          doc.text("(Return)", margin + 95, y);
        }
        y += 8;
      });

      y += 5;
    });
  }

  const footerY = pageHeight - 10;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageWidth / 2, footerY, {
    align: "center",
  });

  const filename = `${customer.name || "customer"}_udhar_report_${format(new Date(), "yyyy-MM-dd")}.pdf`;

  if (options?.asBlob) {
    return { blob: doc.output("blob"), filename };
  }

  doc.save(filename);
  return filename;
}
