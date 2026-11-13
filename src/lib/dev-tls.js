/**
 * Dev/VPN TLS helpers for Node HTTPS clients (AWS SDK, etc.).
 * Mirrors rules in resilient-fetch.js — server-only.
 */

import fs from "fs";
import https from "https";
import { NodeHttpHandler } from "@smithy/node-http-handler";

let cachedAgent;

/** @returns {https.Agent|undefined} */
export function getDevHttpsAgent() {
  if (cachedAgent) return cachedAgent;

  const caPath = process.env.CUSTOM_CA_CERT_PATH;
  if (caPath && fs.existsSync(caPath)) {
    cachedAgent = new https.Agent({
      ca: fs.readFileSync(caPath, "utf8"),
    });
    return cachedAgent;
  }

  if (process.env.NODE_ENV === "development" && process.env.DEV_INSECURE_TLS === "1") {
    cachedAgent = new https.Agent({ rejectUnauthorized: false });
    return cachedAgent;
  }

  return undefined;
}

/** AWS SDK v3 request handler when VPN SSL inspection is active */
export function getAwsTlsRequestHandler() {
  const agent = getDevHttpsAgent();
  if (!agent) return undefined;
  return new NodeHttpHandler({ httpsAgent: agent });
}
