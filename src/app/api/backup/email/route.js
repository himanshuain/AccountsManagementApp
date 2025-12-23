import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { Resend } from "resend";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for email sending

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper to convert snake_case to camelCase
const toCamelCase = obj => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

// Helper to log backup
async function logBackup(supabase, logData) {
  try {
    await supabase.from("backup_logs").insert(logData);
  } catch (error) {
    console.error("Failed to log backup:", error);
  }
}

// Helper to create backup data
async function createBackupData(supabase) {
  const [
    suppliersResult,
    transactionsResult,
    customersResult,
    udharResult,
    incomeResult,
  ] = await Promise.all([
    supabase.from("suppliers").select("*").order("created_at", { ascending: true }),
    supabase.from("transactions").select("*").order("created_at", { ascending: true }),
    supabase.from("customers").select("*").order("created_at", { ascending: true }),
    supabase.from("udhar").select("*").order("created_at", { ascending: true }),
    supabase.from("income").select("*").order("created_at", { ascending: true }),
  ]);

  const counts = {
    suppliers: suppliersResult.data?.length || 0,
    transactions: transactionsResult.data?.length || 0,
    customers: customersResult.data?.length || 0,
    udhar: udharResult.data?.length || 0,
    income: incomeResult.data?.length || 0,
  };

  const backup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    appName: "Clothes Shop Manager",
    data: {
      suppliers: (suppliersResult.data || []).map(toCamelCase),
      transactions: (transactionsResult.data || []).map(toCamelCase),
      customers: (customersResult.data || []).map(toCamelCase),
      udhar: (udharResult.data || []).map(toCamelCase),
      income: (incomeResult.data || []).map(toCamelCase),
    },
    counts,
  };

  return { backup, counts };
}

/**
 * POST: Send backup to email address
 */
export async function POST(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, type = "manual_email" } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { success: false, error: "Email service not configured. Add RESEND_API_KEY to environment." },
        { status: 500 }
      );
    }

    const supabase = getServerClient();

    // Create backup data
    const { backup, counts } = await createBackupData(supabase);
    const jsonString = JSON.stringify(backup, null, 2);
    const fileSizeBytes = new Blob([jsonString]).size;
    const filename = `shop-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;

    // Calculate totals for email summary
    const totalRecords = Object.values(counts).reduce((sum, c) => sum + c, 0);

    // Send email with backup attachment
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Backup <onboarding@resend.dev>",
      to: email,
      subject: `Shop Manager Backup - ${format(new Date(), "dd MMM yyyy")}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Shop Manager Backup</h2>
          <p>Your backup has been created successfully.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #666;">Backup Summary</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li>📦 Suppliers: <strong>${counts.suppliers}</strong></li>
              <li>📋 Transactions: <strong>${counts.transactions}</strong></li>
              <li>👥 Customers: <strong>${counts.customers}</strong></li>
              <li>💳 Udhar Records: <strong>${counts.udhar}</strong></li>
              <li>💰 Income Records: <strong>${counts.income}</strong></li>
            </ul>
            <p style="margin-bottom: 0; margin-top: 10px; color: #888;">
              Total: <strong>${totalRecords} records</strong> | 
              Size: <strong>${(fileSizeBytes / 1024).toFixed(1)} KB</strong>
            </p>
          </div>
          
          <p style="color: #666;">
            The backup file is attached to this email. To restore this data, 
            upload the JSON file in the app's Backup & Restore section.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Generated on ${format(new Date(), "dd MMMM yyyy 'at' hh:mm a")}
          </p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: Buffer.from(jsonString).toString("base64"),
        },
      ],
    });

    if (emailError) {
      // Log failed backup
      await logBackup(supabase, {
        type,
        status: "failed",
        email,
        record_counts: counts,
        file_size_bytes: fileSizeBytes,
        error_message: emailError.message,
      });

      console.error("Email send error:", emailError);
      return NextResponse.json(
        { success: false, error: "Failed to send email: " + emailError.message },
        { status: 500 }
      );
    }

    // Log successful backup
    await logBackup(supabase, {
      type,
      status: "success",
      email,
      record_counts: counts,
      file_size_bytes: fileSizeBytes,
    });

    return NextResponse.json({
      success: true,
      message: `Backup sent to ${email}`,
      counts,
      fileSizeBytes,
    });
  } catch (error) {
    console.error("[Backup Email API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

