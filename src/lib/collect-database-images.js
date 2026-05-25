/**
 * Collect every image reference stored in Supabase (all comparable forms).
 * Shared by R2 and ImageKit orphan cleanup so keys and legacy URLs match.
 */

import { getServerClient } from "@/lib/supabase";
import { getComparableImageRefs } from "@/lib/image-url";

function addRef(set, value) {
  getComparableImageRefs(value).forEach(r => set.add(r));
}

function addRefsFromArray(set, arr) {
  if (Array.isArray(arr)) arr.forEach(v => addRef(set, v));
}

function addRefsFromPayments(set, payments) {
  if (!Array.isArray(payments)) return;
  payments.forEach(payment => {
    addRef(set, payment.receiptUrl);
    addRef(set, payment.receipt_url);
    addRef(set, payment.receiptKey);
    addRef(set, payment.receipt_key);
    addRefsFromArray(set, payment.receiptUrls);
    addRefsFromArray(set, payment.receipt_urls);
  });
}

/**
 * @returns {Promise<Set<string>>}
 */
export async function collectAllDatabaseImageRefs() {
  const supabase = getServerClient();
  const allImages = new Set();

  const { data: customers } = await supabase
    .from("customers")
    .select("profile_picture, khata_photo, khata_photos");

  customers?.forEach(c => {
    addRef(allImages, c.profile_picture);
    addRef(allImages, c.khata_photo);
    addRefsFromArray(allImages, c.khata_photos);
  });

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("profile_picture, upi_qr_code, logo, photos");

  suppliers?.forEach(s => {
    addRef(allImages, s.profile_picture);
    addRef(allImages, s.upi_qr_code);
    addRef(allImages, s.logo);
    addRefsFromArray(allImages, s.photos);
  });

  const { data: transactions } = await supabase
    .from("transactions")
    .select("bill_images, payments");

  transactions?.forEach(t => {
    addRefsFromArray(allImages, t.bill_images);
    addRefsFromPayments(allImages, t.payments);
  });

  const { data: udhars } = await supabase.from("udhar").select("khata_photos, bill_image, payments");

  udhars?.forEach(u => {
    addRef(allImages, u.bill_image);
    addRefsFromArray(allImages, u.khata_photos);
    addRefsFromPayments(allImages, u.payments);
  });

  return allImages;
}
