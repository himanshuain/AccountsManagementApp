/**
 * Server-only fetch wrapper for Supabase when VPN SSL inspection is active.
 * - CUSTOM_CA_CERT_PATH: company root CA .pem (preferred)
 * - DEV_INSECURE_TLS=1: skip cert verification in development only
 */

import fs from "fs";
import { Agent, fetch as undiciFetch } from "undici";

let tlsDispatcher;

function getTlsDispatcher() {
  if (tlsDispatcher) return tlsDispatcher;

  const caPath = process.env.CUSTOM_CA_CERT_PATH;
  if (caPath && fs.existsSync(caPath)) {
    tlsDispatcher = new Agent({
      connect: { ca: fs.readFileSync(caPath, "utf8") },
    });
    return tlsDispatcher;
  }

  if (process.env.NODE_ENV === "development" && process.env.DEV_INSECURE_TLS === "1") {
    tlsDispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
    return tlsDispatcher;
  }

  return undefined;
}

export function resilientFetch(input, init = {}) {
  const dispatcher = getTlsDispatcher();
  // Node's built-in fetch must not use an Agent from another undici build (breaks on Node 22+).
  if (dispatcher) {
    return undiciFetch(input, { ...init, dispatcher });
  }
  return fetch(input, init);
}

export default resilientFetch;
