import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Helper to convert camelCase to snake_case
const toSnakeCase = obj => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {});
};

/**
 * POST: Restore data from backup file
 *
 * Options:
 * - mode: "merge" (add new records, skip existing) or "replace" (clear and restore all)
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
    const { backup, mode = "merge" } = body;

    // Validate backup structure
    if (!backup || !backup.data || !backup.version) {
      return NextResponse.json(
        { success: false, error: "Invalid backup file format" },
        { status: 400 }
      );
    }

    if (!["merge", "replace"].includes(mode)) {
      return NextResponse.json(
        { success: false, error: "Mode must be 'merge' or 'replace'" },
        { status: 400 }
      );
    }

    const supabase = getServerClient();
    const { data: backupData } = backup;
    const results = {
      suppliers: { inserted: 0, skipped: 0, errors: 0 },
      transactions: { inserted: 0, skipped: 0, errors: 0 },
      customers: { inserted: 0, skipped: 0, errors: 0 },
      udhar: { inserted: 0, skipped: 0, errors: 0 },
      income: { inserted: 0, skipped: 0, errors: 0 },
    };

    // If replace mode, clear existing data first
    if (mode === "replace") {
      console.log("Replace mode: Clearing existing data...");

      // Delete in correct order (children first due to foreign keys)
      await supabase.from("udhar").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("income").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase
        .from("transactions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("suppliers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // Restore suppliers first (parent table)
    if (backupData.suppliers?.length > 0) {
      for (const supplier of backupData.suppliers) {
        try {
          const snakeCaseData = toSnakeCase(supplier);
          const { error } = await supabase.from("suppliers").upsert(snakeCaseData, {
            onConflict: "id",
            ignoreDuplicates: mode === "merge",
          });

          if (error) {
            if (error.code === "23505") {
              results.suppliers.skipped++;
            } else {
              console.error("Supplier insert error:", error);
              results.suppliers.errors++;
            }
          } else {
            results.suppliers.inserted++;
          }
        } catch (err) {
          results.suppliers.errors++;
        }
      }
    }

    // Restore customers
    if (backupData.customers?.length > 0) {
      for (const customer of backupData.customers) {
        try {
          const snakeCaseData = toSnakeCase(customer);
          const { error } = await supabase.from("customers").upsert(snakeCaseData, {
            onConflict: "id",
            ignoreDuplicates: mode === "merge",
          });

          if (error) {
            if (error.code === "23505") {
              results.customers.skipped++;
            } else {
              console.error("Customer insert error:", error);
              results.customers.errors++;
            }
          } else {
            results.customers.inserted++;
          }
        } catch (err) {
          results.customers.errors++;
        }
      }
    }

    // Restore transactions (depends on suppliers)
    if (backupData.transactions?.length > 0) {
      for (const transaction of backupData.transactions) {
        try {
          const snakeCaseData = toSnakeCase(transaction);
          const { error } = await supabase.from("transactions").upsert(snakeCaseData, {
            onConflict: "id",
            ignoreDuplicates: mode === "merge",
          });

          if (error) {
            if (error.code === "23505") {
              results.transactions.skipped++;
            } else {
              console.error("Transaction insert error:", error);
              results.transactions.errors++;
            }
          } else {
            results.transactions.inserted++;
          }
        } catch (err) {
          results.transactions.errors++;
        }
      }
    }

    // Restore udhar (depends on customers)
    if (backupData.udhar?.length > 0) {
      for (const udharItem of backupData.udhar) {
        try {
          const snakeCaseData = toSnakeCase(udharItem);
          const { error } = await supabase.from("udhar").upsert(snakeCaseData, {
            onConflict: "id",
            ignoreDuplicates: mode === "merge",
          });

          if (error) {
            if (error.code === "23505") {
              results.udhar.skipped++;
            } else {
              console.error("Udhar insert error:", error);
              results.udhar.errors++;
            }
          } else {
            results.udhar.inserted++;
          }
        } catch (err) {
          results.udhar.errors++;
        }
      }
    }

    // Restore income (depends on customers)
    if (backupData.income?.length > 0) {
      for (const incomeItem of backupData.income) {
        try {
          const snakeCaseData = toSnakeCase(incomeItem);
          const { error } = await supabase.from("income").upsert(snakeCaseData, {
            onConflict: "id",
            ignoreDuplicates: mode === "merge",
          });

          if (error) {
            if (error.code === "23505") {
              results.income.skipped++;
            } else {
              console.error("Income insert error:", error);
              results.income.errors++;
            }
          } else {
            results.income.inserted++;
          }
        } catch (err) {
          results.income.errors++;
        }
      }
    }

    // Calculate summary
    const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      message: `Restore complete: ${totalInserted} inserted, ${totalSkipped} skipped, ${totalErrors} errors`,
      results,
      summary: {
        totalInserted,
        totalSkipped,
        totalErrors,
        mode,
        backupDate: backup.exportedAt,
      },
    });
  } catch (error) {
    console.error("[Backup Restore API] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
