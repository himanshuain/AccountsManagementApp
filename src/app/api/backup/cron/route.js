import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { Resend } from "resend";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const [suppliersResult, transactionsResult, customersResult, udharResult, incomeResult] =
    await Promise.all([
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
 * GET: Cron job endpoint for scheduled backups
 * This runs every 3 months and sends backup to configured email
 */
export async function GET(request) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if no secret is set (development) or if it matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const backupEmail = process.env.BACKUP_EMAIL;
    if (!backupEmail) {
      return NextResponse.json(
        { success: false, error: "BACKUP_EMAIL not configured" },
        { status: 500 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { success: false, error: "Email service not configured" },
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
      to: backupEmail,
      subject: `[Scheduled] Shop Manager Backup - ${format(new Date(), "dd MMM yyyy")}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🗓️ Scheduled Shop Manager Backup</h2>
          <p>Your quarterly automatic backup has been created successfully.</p>
          
          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>This is an automated backup</strong> sent every 3 months to ensure your data is safe.
            </p>
          </div>
          
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
            The backup file is attached to this email. Keep this email safe or save the 
            attachment to your cloud storage (Google Drive, Dropbox, etc.).
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Generated on ${format(new Date(), "dd MMMM yyyy 'at' hh:mm a")} | 
            Next backup: ${format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "dd MMM yyyy")}
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
        type: "scheduled_cron",
        status: "failed",
        email: backupEmail,
        record_counts: counts,
        file_size_bytes: fileSizeBytes,
        error_message: emailError.message,
      });

      console.error("Cron backup email error:", emailError);
      return NextResponse.json(
        { success: false, error: "Failed to send backup email" },
        { status: 500 }
      );
    }

    // Log successful backup
    await logBackup(supabase, {
      type: "scheduled_cron",
      status: "success",
      email: backupEmail,
      record_counts: counts,
      file_size_bytes: fileSizeBytes,
    });

    console.log(`Cron backup sent successfully to ${backupEmail}`);

    return NextResponse.json({
      success: true,
      message: `Scheduled backup sent to ${backupEmail}`,
      counts,
    });
  } catch (error) {
    console.error("[Backup Cron] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
