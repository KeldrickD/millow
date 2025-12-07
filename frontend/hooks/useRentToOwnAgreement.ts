"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RENT_TO_OWN_ADDRESS, rentToOwnAbi } from "../lib/contracts";

export function useRentToOwnAgreement(agreementId?: bigint) {
  const [lastTx, setLastTx] = useState<`0x${string}` | undefined>(undefined);

  const { data: agreement } = useReadContract({
    address: RENT_TO_OWN_ADDRESS,
    abi: rentToOwnAbi,
    functionName: "getAgreement",
    args: agreementId ? [agreementId] : undefined
  } as any);

  const { data: txHash, writeContract, isPending } = useWriteContract();
  const { isLoading: txPending } = useWaitForTransactionReceipt({ hash: txHash ?? lastTx });

  const pay = () => {
    if (!agreementId) return;
    writeContract(
      {
        address: RENT_TO_OWN_ADDRESS as `0x${string}`,
        abi: rentToOwnAbi as any,
        functionName: "pay",
        args: [agreementId]
      },
      {
        onSuccess(hash) {
          setLastTx(hash);
        }
      }
    );
  };

  let totalPayments = 0;
  let paymentsMade = 0;
  let equityPerPayment = 0;
  let progress = 0;
  let totalEquity = 0;

  if (agreement) {
    const a: any = agreement;
    equityPerPayment = Number(a.equitySharesPerPayment ?? 0n);
    totalPayments = Number(a.maxPayments ?? 0n);
    paymentsMade = Number(a.paymentsMade ?? 0n);
    totalEquity = equityPerPayment * paymentsMade;
    progress = totalPayments > 0 ? (paymentsMade / totalPayments) * 100 : 0;
  }

  return {
    agreement,
    totalPayments,
    paymentsMade,
    equityPerPayment,
    totalEquity,
    progress,
    pay,
    txPending: txPending || isPending
  };
}

