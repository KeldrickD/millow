"use client";

import { useParams } from "next/navigation";
import PropertySummary from "../../../components/PropertySummary";
import DealProgress from "../../../components/DealProgress";
import DepositAndVoteForm from "../../../components/DepositAndVoteForm";
import InvestorPosition from "../../../components/InvestorPosition";
import EscrowActions from "../../../components/EscrowActions";

export default function PropertyPage() {
  const params = useParams();
  const propertyId = Number(params?.propertyId || 1);

  return (
    <div className="space-y-6">
      <PropertySummary propertyId={propertyId} />
      <DealProgress propertyId={propertyId} />
      <div className="grid" style={{ gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <DepositAndVoteForm propertyId={propertyId} />
        <InvestorPosition propertyId={propertyId} />
      </div>
      <EscrowActions propertyId={propertyId} />
    </div>
  );
}


