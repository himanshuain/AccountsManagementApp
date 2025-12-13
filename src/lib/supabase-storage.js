import { supabase, isSupabaseConfigured } from "./supabase";

// Helper to convert camelCase to snake_case
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {});
};

// Helper to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

// ==================== SUPPLIERS ====================

export async function loadSuppliers() {
  if (!isSupabaseConfigured()) {
    console.warn("[Supabase] Not configured, returning empty suppliers");
    return [];
  }

  try {
    console.log("[Supabase] Loading suppliers...");
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Error loading suppliers:", error);
      return [];
    }

    console.log("[Supabase] Loaded", data?.length || 0, "suppliers");
    return (data || []).map(toCamelCase);
  } catch (error) {
    console.error("[Supabase] Error loading suppliers:", error);
    return [];
  }
}

export async function syncSuppliersToSupabase(operations) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  const results = [];

  for (const op of operations) {
    const record = toSnakeCase(op.data);
    // Remove fields that shouldn't be sent to DB
    delete record.sync_status;

    console.log("[Supabase] Syncing supplier:", op.operation, record);

    if (op.operation === "create") {
      const { data, error } = await supabase
        .from("suppliers")
        .upsert(record, {
          onConflict: "id",
        })
        .select();
      if (error) {
        console.error("[Supabase] Create supplier error:", error);
        throw new Error(`Failed to create supplier: ${error.message}`);
      }
      console.log("[Supabase] Created supplier:", data);
      results.push(data);
    } else if (op.operation === "update") {
      const { data, error } = await supabase
        .from("suppliers")
        .update(record)
        .eq("id", op.entityId)
        .select();
      if (error) {
        console.error("[Supabase] Update supplier error:", error);
        throw new Error(`Failed to update supplier: ${error.message}`);
      }
      console.log("[Supabase] Updated supplier:", data);
      results.push(data);
    } else if (op.operation === "delete") {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", op.entityId);
      if (error) {
        console.error("[Supabase] Delete supplier error:", error);
        throw new Error(`Failed to delete supplier: ${error.message}`);
      }
    }
  }

  return await loadSuppliers();
}

// ==================== TRANSACTIONS ====================

export async function loadTransactions() {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Error loading transactions:", error);
      return [];
    }

    return (data || []).map(toCamelCase);
  } catch (error) {
    console.error("[Supabase] Error loading transactions:", error);
    return [];
  }
}

export async function syncTransactionsToSupabase(operations) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  for (const op of operations) {
    const record = toSnakeCase(op.data);
    delete record.sync_status;

    console.log("[Supabase] Syncing transaction:", op.operation, record);

    if (op.operation === "create") {
      const { data, error } = await supabase
        .from("transactions")
        .upsert(record, {
          onConflict: "id",
        })
        .select();
      if (error) {
        console.error("[Supabase] Create transaction error:", error);
        throw new Error(`Failed to create transaction: ${error.message}`);
      }
      console.log("[Supabase] Created transaction:", data);
    } else if (op.operation === "update") {
      const { data, error } = await supabase
        .from("transactions")
        .update(record)
        .eq("id", op.entityId)
        .select();
      if (error) {
        console.error("[Supabase] Update transaction error:", error);
        throw new Error(`Failed to update transaction: ${error.message}`);
      }
      console.log("[Supabase] Updated transaction:", data);
    } else if (op.operation === "delete") {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", op.entityId);
      if (error) {
        console.error("[Supabase] Delete transaction error:", error);
        throw new Error(`Failed to delete transaction: ${error.message}`);
      }
    }
  }

  return await loadTransactions();
}

// ==================== CUSTOMERS ====================

export async function loadCustomers() {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Error loading customers:", error);
      return [];
    }

    return (data || []).map(toCamelCase);
  } catch (error) {
    console.error("[Supabase] Error loading customers:", error);
    return [];
  }
}

export async function syncCustomersToSupabase(operations) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  for (const op of operations) {
    const record = toSnakeCase(op.data);
    delete record.sync_status;

    console.log("[Supabase] Syncing customer:", op.operation, record);

    if (op.operation === "create") {
      const { data, error } = await supabase
        .from("customers")
        .upsert(record, {
          onConflict: "id",
        })
        .select();
      if (error) {
        console.error("[Supabase] Create customer error:", error);
        throw new Error(`Failed to create customer: ${error.message}`);
      }
      console.log("[Supabase] Created customer:", data);
    } else if (op.operation === "update") {
      const { data, error } = await supabase
        .from("customers")
        .update(record)
        .eq("id", op.entityId)
        .select();
      if (error) {
        console.error("[Supabase] Update customer error:", error);
        throw new Error(`Failed to update customer: ${error.message}`);
      }
      console.log("[Supabase] Updated customer:", data);
    } else if (op.operation === "delete") {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", op.entityId);
      if (error) {
        console.error("[Supabase] Delete customer error:", error);
        throw new Error(`Failed to delete customer: ${error.message}`);
      }
    }
  }

  return await loadCustomers();
}

// ==================== UDHAR ====================

export async function loadUdhar() {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("udhar")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Error loading udhar:", error);
      return [];
    }

    return (data || []).map(toCamelCase);
  } catch (error) {
    console.error("[Supabase] Error loading udhar:", error);
    return [];
  }
}

export async function syncUdharToSupabase(operations) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  for (const op of operations) {
    const record = toSnakeCase(op.data);
    delete record.sync_status;

    console.log("[Supabase] Syncing udhar:", op.operation, record);

    if (op.operation === "create") {
      const { data, error } = await supabase
        .from("udhar")
        .upsert(record, {
          onConflict: "id",
        })
        .select();
      if (error) {
        console.error("[Supabase] Create udhar error:", error);
        throw new Error(`Failed to create udhar: ${error.message}`);
      }
      console.log("[Supabase] Created udhar:", data);
    } else if (op.operation === "update") {
      const { data, error } = await supabase
        .from("udhar")
        .update(record)
        .eq("id", op.entityId)
        .select();
      if (error) {
        console.error("[Supabase] Update udhar error:", error);
        throw new Error(`Failed to update udhar: ${error.message}`);
      }
      console.log("[Supabase] Updated udhar:", data);
    } else if (op.operation === "delete") {
      const { error } = await supabase
        .from("udhar")
        .delete()
        .eq("id", op.entityId);
      if (error) {
        console.error("[Supabase] Delete udhar error:", error);
        throw new Error(`Failed to delete udhar: ${error.message}`);
      }
    }
  }

  return await loadUdhar();
}

// ==================== INCOME ====================

export async function loadIncome() {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("income")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Error loading income:", error);
      return [];
    }

    return (data || []).map(toCamelCase);
  } catch (error) {
    console.error("[Supabase] Error loading income:", error);
    return [];
  }
}

export async function syncIncomeToSupabase(operations) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  for (const op of operations) {
    const record = toSnakeCase(op.data);
    delete record.sync_status;

    console.log("[Supabase] Syncing income:", op.operation, record);

    if (op.operation === "create") {
      const { data, error } = await supabase
        .from("income")
        .upsert(record, {
          onConflict: "id",
        })
        .select();
      if (error) {
        console.error("[Supabase] Create income error:", error);
        throw new Error(`Failed to create income: ${error.message}`);
      }
      console.log("[Supabase] Created income:", data);
    } else if (op.operation === "update") {
      const { data, error } = await supabase
        .from("income")
        .update(record)
        .eq("id", op.entityId)
        .select();
      if (error) {
        console.error("[Supabase] Update income error:", error);
        throw new Error(`Failed to update income: ${error.message}`);
      }
      console.log("[Supabase] Updated income:", data);
    } else if (op.operation === "delete") {
      const { error } = await supabase
        .from("income")
        .delete()
        .eq("id", op.entityId);
      if (error) {
        console.error("[Supabase] Delete income error:", error);
        throw new Error(`Failed to delete income: ${error.message}`);
      }
    }
  }

  return await loadIncome();
}

// ==================== FULL SYNC ====================

export async function fullSync(localData) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  const { suppliers, transactions, customers, udhar, income } = localData;

  // Upsert all local data to Supabase
  if (suppliers?.length > 0) {
    const records = suppliers.map((s) => {
      const record = toSnakeCase(s);
      delete record.sync_status;
      return record;
    });
    await supabase.from("suppliers").upsert(records, { onConflict: "id" });
  }

  if (transactions?.length > 0) {
    const records = transactions.map((t) => {
      const record = toSnakeCase(t);
      delete record.sync_status;
      return record;
    });
    await supabase.from("transactions").upsert(records, { onConflict: "id" });
  }

  if (customers?.length > 0) {
    const records = customers.map((c) => {
      const record = toSnakeCase(c);
      delete record.sync_status;
      return record;
    });
    await supabase.from("customers").upsert(records, { onConflict: "id" });
  }

  if (udhar?.length > 0) {
    const records = udhar.map((u) => {
      const record = toSnakeCase(u);
      delete record.sync_status;
      return record;
    });
    await supabase.from("udhar").upsert(records, { onConflict: "id" });
  }

  if (income?.length > 0) {
    const records = income.map((i) => {
      const record = toSnakeCase(i);
      delete record.sync_status;
      return record;
    });
    await supabase.from("income").upsert(records, { onConflict: "id" });
  }

  // Return all data from Supabase
  return {
    suppliers: await loadSuppliers(),
    transactions: await loadTransactions(),
    customers: await loadCustomers(),
    udhar: await loadUdhar(),
    income: await loadIncome(),
  };
}

// ==================== IMAGE UPLOAD ====================
// For images, we'll use Supabase Storage

export async function uploadImageToSupabase(file, folder = "general") {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured - image upload skipped");
    return null;
  }

  try {
    const filename = `${folder}/${Date.now()}-${file.name || "image.jpg"}`;
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[Supabase] Image upload error:", error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("[Supabase] Image upload error:", error);
    return null;
  }
}

export async function uploadImageFromBase64ToSupabase(
  base64Data,
  filename,
  folder = "general",
) {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured - image upload skipped");
    return null;
  }

  try {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();

    return await uploadImageToSupabase(blob, folder);
  } catch (error) {
    console.error("[Supabase] Base64 image upload error:", error);
    return null;
  }
}
