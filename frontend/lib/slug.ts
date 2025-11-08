import { keccak256, stringToHex } from "viem";

export function normalizePropertyKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s\-]/g, "")
    .replace(/\s+/g, "-");
}

export function idFromPropertyKey(input: string): bigint {
  const slug = normalizePropertyKey(input);
  const hex = keccak256(stringToHex(slug));
  return BigInt(hex);
}


