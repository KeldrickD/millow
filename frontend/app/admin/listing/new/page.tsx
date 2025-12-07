"use client";

import { useRef, useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import {
  PROPERTY_ADDRESS
} from "../../../../lib/contracts";
import { idFromPropertyKey } from "../../../../lib/slug";
import toast from "react-hot-toast";
import { uploadImages, uploadMetadata } from "../../../../lib/upload";
import { useCreateListing } from "../../../../hooks/useCreateListing";

export default function NewListingPage() {
  const { address } = useAccount();
  const { start, inFlight } = useCreateListing();

  // Listing form state
  const [label, setLabel] = useState("");
  const [targetEth, setTargetEth] = useState("1");
  const [sharePriceEth, setSharePriceEth] = useState("0.1");
  const [maxShares, setMaxShares] = useState("1000");
  const [yieldBps, setYieldBps] = useState("500");
  const [days, setDays] = useState("7");
  const [seller, setSeller] = useState("");
  const [description, setDescription] = useState("");

  // Images
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function onPickFiles() {
    fileInputRef.current?.click();
  }

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = Array.from(e.target.files || []).slice(0, 8);
    setFiles(f);
  }

  async function onSubmit() {
    try {
      // 1) Upload images and metadata to IPFS
      let imageUris: string[] = [];
      if (files.length > 0) {
        toast.loading("Uploading images…", { id: "upload" });
        imageUris = await uploadImages(files);
      }
      const metadata = {
        label,
        description,
        images: imageUris,
        attributes: {
          targetEth,
          sharePriceEth,
          maxShares,
          yieldBps,
          days
        },
        version: 1
      };
      const metadataURI = await uploadMetadata(metadata);
      toast.success("Metadata uploaded ✅", { id: "upload" });

      const pid = idFromPropertyKey(label);
      const sharePriceWei = parseEther(sharePriceEth);
      const max = BigInt(maxShares || "0");
      const ybps = Number(yieldBps || "0");

      const targetWei = parseEther(targetEth || "0");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(days || "0") * 24 * 60 * 60);

      const sellerAddr =
        seller && seller.trim().length > 0
          ? (seller as `0x${string}`)
          : ((address as `0x${string}` | undefined) ?? "0x0000000000000000000000000000000000000000");

      start({
        propertyId: pid,
        seller: sellerAddr,
        targetWei,
        deadline,
        description: description || label,
        maxShares: max,
        sharePriceWei,
        yieldBps: ybps,
        metadataURI,
        labelForRoute: label
      });
    } catch (e) {
      console.error(e);
      toast.error("Invalid input");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Create New Listing</h1>
      <p className="text-xs text-mirage/70">
        Upload photos, enter property details, and we will create the ERC-1155 series and proposal in one click.
      </p>

      {/* Images */}
      <section className="bg-white rounded-2xl border border-white p-4 space-y-3">
        <p className="text-sm font-semibold">Photos</p>
        <div className="flex gap-3 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="h-24 w-32 rounded-lg overflow-hidden bg-mirage/5 border border-white">
              <img
                src={URL.createObjectURL(f)}
                alt={`Preview ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={onPickFiles}
            className="h-24 w-32 rounded-lg border border-dashed border-mirage/20 flex items-center justify-center text-xs text-mirage/60 hover:bg-mirage/5"
          >
            + Add photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesChange}
          />
        </div>
      </section>

      {/* Form */}
      <section className="bg-white rounded-2xl border border-white p-4 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block text-xs">
            <span className="text-mirage/60">Property label (address)</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" placeholder="905 Gaston St SW, Atlanta, GA" />
          </label>
          <label className="block text-xs">
            <span className="text-mirage/60">Target raise (ETH)</span>
            <input value={targetEth} onChange={(e) => setTargetEth(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="text-mirage/60">Share price (ETH)</span>
            <input value={sharePriceEth} onChange={(e) => setSharePriceEth(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="text-mirage/60">Max shares</span>
            <input value={maxShares} onChange={(e) => setMaxShares(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="text-mirage/60">Yield Bps (mock)</span>
            <input value={yieldBps} onChange={(e) => setYieldBps(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="text-mirage/60">Funding window (days)</span>
            <input value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="text-mirage/60">Seller wallet (optional)</span>
            <input value={seller} onChange={(e) => setSeller(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" placeholder="0x..." />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="text-mirage/60">Short description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-2 text-sm" rows={3} placeholder="Discover this beautifully updated..."></textarea>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={inFlight}
            onClick={onSubmit}
            className="rounded-md bg-blaze text-white px-4 py-2 text-sm disabled:bg-mirage/20"
          >
            {inFlight ? "Creating…" : "Create Listing (ERC‑1155 + Proposal)"}
          </button>
        </div>
      </section>
    </div>
  );
}


