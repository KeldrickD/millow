"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt
} from "wagmi";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  PROPERTY_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  propertyAbi,
  voteEscrowAbi
} from "../lib/contracts";
import { base, baseSepolia } from "wagmi/chains";

export type CreateListingArgs = {
  propertyId: bigint;
  seller: `0x${string}`;
  targetWei: bigint;
  deadline: bigint;
  description: string;
  // Property.createProperty config
  maxShares: bigint;
  sharePriceWei: bigint;
  yieldBps: number;
  metadataURI: string;
  labelForRoute?: string;
};

export function useCreateListing() {
  const router = useRouter();
  const { address } = useAccount();

  const { writeContract: writeProperty, data: txCreate } = useWriteContract();
  const { writeContract: writeEscrow, data: txPropose } = useWriteContract();

  const [args, setArgs] = useState<CreateListingArgs | null>(null);
  const [inFlight, setInFlight] = useState(false);

  const { isSuccess: createSuccess } = useWaitForTransactionReceipt({
    hash: txCreate,
    query: { enabled: Boolean(txCreate) }
  });

  const { isSuccess: proposeSuccess } = useWaitForTransactionReceipt({
    hash: txPropose,
    query: { enabled: Boolean(txPropose) }
  });

  const { refetch: refetchAllIds } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getAllPropertyIds"
  });

  // Step 2: when createProperty mined, fire proposeProperty
  useEffect(() => {
    if (!createSuccess || !args) return;
    if (!address) {
      toast.error("Connect your wallet to create a listing.");
      setInFlight(false);
      return;
    }
    writeEscrow(
      {
        address: VOTE_ESCROW_ADDRESS,
        abi: voteEscrowAbi,
        functionName: "proposeProperty",
        args: [
          args.propertyId,
          args.seller,
          args.targetWei,
          args.deadline,
          args.description
        ],
        chain: baseSepolia,
        account: address as `0x${string}`
      },
      {
        onSuccess(hash) {
          toast.loading("Creating on-chain proposal…", { id: hash });
        },
        onError(err) {
          console.error(err);
          toast.error("Failed to create proposal");
          setInFlight(false);
        }
      }
    );
  }, [createSuccess, args, writeEscrow]);

  // Step 3: after proposal mined → refetch + route
  useEffect(() => {
    if (!proposeSuccess || !args) return;
    (async () => {
      try {
        await refetchAllIds();
      } catch {}
      toast.success("Listing created ✅");
      const label = args.labelForRoute ?? args.metadataURI;
      // push to property route if label provided
      if (label) {
        try {
          router.push(`/property/${encodeURIComponent(label)}`);
        } catch {}
      }
      setInFlight(false);
    })();
  }, [proposeSuccess, args, refetchAllIds, router]);

  const start = useMemo(
    () =>
      (p: CreateListingArgs) => {
        if (inFlight) return;
        setInFlight(true);
        setArgs(p);
        if (!address) {
          toast.error("Connect your wallet to create a listing.");
          setInFlight(false);
          return;
        }
        writeProperty(
          {
            address: PROPERTY_ADDRESS,
            abi: propertyAbi,
            functionName: "createProperty",
            args: [
              p.propertyId,
              p.maxShares,
              p.sharePriceWei,
              p.yieldBps,
              p.metadataURI
            ],
            chain: baseSepolia,
            account: address as `0x${string}`
          },
          {
            onSuccess(hash) {
              toast.loading("Creating ERC-1155 series…", { id: `cp-${hash}` });
            },
            onError(err) {
              console.warn("createProperty failed, attempting to proceed:", err);
              // Continue by attempting to propose anyway (in case it already exists)
              // Simulate createSuccess path
              writeEscrow(
                {
                  address: VOTE_ESCROW_ADDRESS,
                  abi: voteEscrowAbi,
                  functionName: "proposeProperty",
                  args: [
                    p.propertyId,
                    p.seller,
                    p.targetWei,
                    p.deadline,
                    p.description
                  ],
                  chain: baseSepolia,
                  account: address as `0x${string}`
                },
                {
                  onSuccess(hash) {
                    toast.loading("Creating on-chain proposal…", { id: hash });
                  },
                  onError(err2) {
                    console.error(err2);
                    toast.error("Failed to create proposal");
                    setInFlight(false);
                  }
                }
              );
            }
          }
        );
      },
    [inFlight, writeProperty, writeEscrow]
  );

  return {
    start,
    inFlight,
    txCreate,
    txPropose,
    createSuccess,
    proposeSuccess
  };
}


