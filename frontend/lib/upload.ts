// Simple client-side upload helpers for IPFS via Pinata (JWT) or Web3.Storage.
// Use env vars:
// - NEXT_PUBLIC_PINATA_JWT (preferred)
// - NEXT_PUBLIC_WEB3STORAGE_TOKEN (fallback for JSON-only)

export async function uploadImages(files: File[]): Promise<string[]> {
  const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (pinataJwt) {
    const urls: string[] = [];
    for (const f of files) {
      const form = new FormData();
      form.append("file", f, f.name);
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${pinataJwt}` },
        body: form
      });
      if (!res.ok) throw new Error("Pinata upload failed");
      const json = await res.json();
      const hash = json.IpfsHash as string;
      urls.push(`ipfs://${hash}`);
    }
    return urls;
  }
  throw new Error("No IPFS upload provider configured (PINATA_JWT missing)");
}

export async function uploadMetadata(obj: any): Promise<string> {
  const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (pinataJwt) {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pinataJwt}`
      },
      body: JSON.stringify(obj)
    });
    if (!res.ok) throw new Error("Pinata JSON upload failed");
    const json = await res.json();
    const hash = json.IpfsHash as string;
    return `ipfs://${hash}`;
  }

  const w3token = process.env.NEXT_PUBLIC_WEB3STORAGE_TOKEN;
  if (w3token) {
    const res = await fetch("https://api.web3.storage/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${w3token}`, "Content-Type": "application/json" },
      body: JSON.stringify(obj)
    });
    if (!res.ok) throw new Error("Web3.Storage upload failed");
    const json = await res.json();
    const cid = json.cid as string;
    return `ipfs://${cid}`;
  }

  throw new Error("No IPFS upload provider configured");
}


