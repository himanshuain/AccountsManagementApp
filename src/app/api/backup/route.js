import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

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

/**
 * GET: Export all data from all tables as JSON
 * This provides a complete backup of the database
 */
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const supabase = getServerClient();

    // Fetch all data from all tables in parallel
    const [suppliersResult, transactionsResult, customersResult, udharResult, incomeResult] =
      await Promise.all([
        supabase.from("suppliers").select("*").order("created_at", { ascending: true }),
        supabase.from("transactions").select("*").order("created_at", { ascending: true }),
        supabase.from("customers").select("*").order("created_at", { ascending: true }),
        supabase.from("udhar").select("*").order("created_at", { ascending: true }),
        supabase.from("income").select("*").order("created_at", { ascending: true }),
      ]);

    // Check for errors
    const errors = [];
    if (suppliersResult.error) errors.push(`Suppliers: ${suppliersResult.error.message}`);
    if (transactionsResult.error) errors.push(`Transactions: ${transactionsResult.error.message}`);
    if (customersResult.error) errors.push(`Customers: ${customersResult.error.message}`);
    if (udharResult.error) errors.push(`Udhar: ${udharResult.error.message}`);
    if (incomeResult.error) errors.push(`Income: ${incomeResult.error.message}`);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch data: ${errors.join(", ")}` },
        { status: 500 }
      );
    }

    // Build the backup object
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
      counts: {
        suppliers: suppliersResult.data?.length || 0,
        transactions: transactionsResult.data?.length || 0,
        customers: customersResult.data?.length || 0,
        udhar: udharResult.data?.length || 0,
        income: incomeResult.data?.length || 0,
      },
    };

    // Calculate totals for summary
    const totalSupplierAmount = (transactionsResult.data || []).reduce(
      (sum, t) => sum + (parseFloat(t.amount) || 0),
      0
    );
    const totalCustomerAmount = (udharResult.data || []).reduce(
      (sum, u) => sum + (parseFloat(u.amount) || 0),
      0
    );
    const totalIncome = (incomeResult.data || []).reduce(
      (sum, i) => sum + (parseFloat(i.amount) || 0),
      0
    );

    backup.summary = {
      totalSupplierTransactions: totalSupplierAmount,
      totalCustomerUdhar: totalCustomerAmount,
      totalIncome: totalIncome,
    };

    // Check URL params for format
    const { searchParams } = new URL(request.url);
    const downloadFormat = searchParams.get("format");

    if (downloadFormat === "download") {
      // Return as downloadable JSON file
      const filename = `shop-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      const jsonString = JSON.stringify(backup, null, 2);

      return new NextResponse(jsonString, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Return as API response
    return NextResponse.json({
      success: true,
      backup,
    });
  } catch (error) {
    console.error("[Backup API] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Restore data from a backup
 * This is a destructive operation - it will replace existing data
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
    const { backup, options = {} } = body;

    if (!backup || !backup.data) {
      return NextResponse.json({ success: false, error: "Invalid backup format" }, { status: 400 });
    }

    const supabase = getServerClient();
    const results = {
      suppliers: { inserted: 0, errors: [] },
      transactions: { inserted: 0, errors: [] },
      customers: { inserted: 0, errors: [] },
      udhar: { inserted: 0, errors: [] },
      income: { inserted: 0, errors: [] },
    };

    // Helper to convert camelCase to snake_case for database
    const toSnakeCase = obj => {
      if (!obj || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(toSnakeCase);

      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        acc[snakeKey] = toSnakeCase(obj[key]);
        return acc;
      }, {});
    };

    // Restore suppliers
    if (backup.data.suppliers?.length > 0) {
      for (const supplier of backup.data.suppliers) {
        const record = toSnakeCase(supplier);
        const { error } = await supabase.from("suppliers").upsert(record, { onConflict: "id" });

        if (error) {
          results.suppliers.errors.push({ id: supplier.id, error: error.message });
        } else {
          results.suppliers.inserted++;
        }
      }
    }

    // Restore customers (before udhar due to foreign key)
    if (backup.data.customers?.length > 0) {
      for (const customer of backup.data.customers) {
        const record = toSnakeCase(customer);
        const { error } = await supabase.from("customers").upsert(record, { onConflict: "id" });

        if (error) {
          results.customers.errors.push({ id: customer.id, error: error.message });
        } else {
          results.customers.inserted++;
        }
      }
    }

    // Restore transactions
    if (backup.data.transactions?.length > 0) {
      for (const transaction of backup.data.transactions) {
        const record = toSnakeCase(transaction);
        const { error } = await supabase.from("transactions").upsert(record, { onConflict: "id" });

        if (error) {
          results.transactions.errors.push({ id: transaction.id, error: error.message });
        } else {
          results.transactions.inserted++;
        }
      }
    }

    // Restore udhar
    if (backup.data.udhar?.length > 0) {
      for (const udhar of backup.data.udhar) {
        const record = toSnakeCase(udhar);
        const { error } = await supabase.from("udhar").upsert(record, { onConflict: "id" });

        if (error) {
          results.udhar.errors.push({ id: udhar.id, error: error.message });
        } else {
          results.udhar.inserted++;
        }
      }
    }

    // Restore income
    if (backup.data.income?.length > 0) {
      for (const income of backup.data.income) {
        const record = toSnakeCase(income);
        const { error } = await supabase.from("income").upsert(record, { onConflict: "id" });

        if (error) {
          results.income.errors.push({ id: income.id, error: error.message });
        } else {
          results.income.inserted++;
        }
      }
    }

    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);
    const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `Restored ${totalInserted} records${totalErrors > 0 ? ` with ${totalErrors} errors` : ""}`,
      results,
    });
  } catch (error) {
    console.error("[Backup API] Restore error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
