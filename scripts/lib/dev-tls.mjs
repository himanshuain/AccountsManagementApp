import https from "https";
import { NodeHttpHandler } from "@smithy/node-http-handler";

/** VPN / corporate proxy — match app dev:vpn + optional NODE_TLS_REJECT_UNAUTHORIZED=0 */
export function useInsecureTls() {
  return (
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
    process.env.DEV_INSECURE_TLS === "1"
  );
}

export function s3TlsRequestHandler() {
  if (!useInsecureTls()) return undefined;
  const agent = new https.Agent({ rejectUnauthorized: false });
  return new NodeHttpHandler({ httpsAgent: agent });
}
