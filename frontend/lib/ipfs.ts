export function getIpfsGateways(): string[] {
  const custom = process.env.NEXT_PUBLIC_PINATA_GATEWAY; // e.g. https://your-subdomain.mypinata.cloud
  const candidates: string[] = [];
  if (custom && /^https?:\/\//i.test(custom)) candidates.push(custom.replace(/\/+$/, ""));
  candidates.push("https://gateway.pinata.cloud");
  candidates.push("https://ipfs.io");
  candidates.push("https://cloudflare-ipfs.com");
  return candidates;
}

export function ipfsToHttp(uri: string): string {
  if (!uri) return uri;
  if (!uri.startsWith("ipfs://")) return uri;
  const path = uri.replace("ipfs://", "").replace(/^ipfs\//, "");
  const gateways = getIpfsGateways();
  return `${gateways[0]}/ipfs/${path}`;
}

export function buildGatewayUrls(uri: string): string[] {
  if (!uri) return [];
  if (!uri.startsWith("ipfs://")) return [uri];
  const path = uri.replace("ipfs://", "").replace(/^ipfs\//, "");
  return getIpfsGateways().map((g) => `${g}/ipfs/${path}`);
}

export async function fetchIpfsJson<T = any>(uri: string): Promise<T> {
  const urls = buildGatewayUrls(uri);
  let lastErr: any;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) continue;
      const json = (await res.json()) as T;
      return json;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error("Failed to load IPFS JSON");
}


