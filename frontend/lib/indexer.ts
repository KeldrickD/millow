import type { Address, PublicClient } from "viem";
import { parseAbiItem, decodeEventLog, encodeEventTopics } from "viem";
import {
  PROPERTY_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  YIELD_VAULT_ADDRESS,
  PROPERTY_DEX_ADDRESS,
  propertyDexAbi,
  RENT_TO_OWN_ADDRESS,
  propertyAbi,
  voteEscrowAbi,
  yieldVaultAbi,
} from "./contracts";

const DEPLOY_BLOCK: bigint =
  process.env.NEXT_PUBLIC_DEPLOY_BLOCK && process.env.NEXT_PUBLIC_DEPLOY_BLOCK.trim() !== ""
    ? BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK)
    : 0n;

// --- Types ---

export type PropertySummary = {
  propertyId: bigint;
  exists: boolean;
  label: string;
  maxShares: bigint;
  sharePriceWei: bigint;
  yieldBps: number;
  targetWei: bigint;
  raisedWei: bigint;
  deadline: bigint;
  finalized: boolean;
  successful: boolean;
};

export type UserHolding = {
  propertyId: bigint;
  shares: bigint;
  pendingYield: bigint;
};

export type ActivityKind =
  | "deposit"
  | "finalized-success"
  | "finalized-fail"
  | "yield-deposited"
  | "yield-claimed"
  | "dex_buy"
  | "dex_sell";

export type ActivityItem = {
  kind: ActivityKind;
  propertyId?: bigint;
  txHash: `0x${string}`;
  blockNumber?: bigint;
  args: any;
};

// Zero address for mint/burn detection
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const RTO_DEPLOY_BLOCK =
  process.env.NEXT_PUBLIC_RTO_DEPLOY_BLOCK && process.env.NEXT_PUBLIC_RTO_DEPLOY_BLOCK.trim() !== ""
    ? BigInt(process.env.NEXT_PUBLIC_RTO_DEPLOY_BLOCK)
    : DEPLOY_BLOCK;
const DEX_DEPLOY_BLOCK =
  process.env.NEXT_PUBLIC_DEX_DEPLOY_BLOCK && process.env.NEXT_PUBLIC_DEX_DEPLOY_BLOCK.trim() !== ""
    ? BigInt(process.env.NEXT_PUBLIC_DEX_DEPLOY_BLOCK)
    : DEPLOY_BLOCK;

// --- Core property discovery ---

export async function fetchAllPropertyIds(client: PublicClient): Promise<bigint[]> {
  const ids = (await (client as any).readContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getAllPropertyIds",
  })) as bigint[];
  return ids ?? [];
}

export async function fetchPropertySummary(client: PublicClient, propertyId: bigint): Promise<PropertySummary> {
  const [propCfg, proposal] = await Promise.all([
    client.readContract({
      address: PROPERTY_ADDRESS,
      abi: propertyAbi,
      functionName: "properties",
      args: [propertyId],
    }),
    client.readContract({
      address: VOTE_ESCROW_ADDRESS,
      abi: voteEscrowAbi,
      functionName: "getProposal",
      args: [propertyId],
    }),
  ]);

  const pArr = propCfg as any[];
  const exists = Boolean(pArr?.[0]);
  const maxShares = (pArr?.[1] ?? 0n) as bigint;
  const sharePriceWei = (pArr?.[2] ?? 0n) as bigint;
  const yieldBps = Number(pArr?.[3] ?? 0);
  const metadataURI = (pArr?.[4] ?? "") as string;

  const rArr = proposal as any[];
  const targetWei = (rArr?.[2] ?? 0n) as bigint;
  const raisedWei = (rArr?.[4] ?? 0n) as bigint;
  const deadline = (rArr?.[5] ?? 0n) as bigint;
  const finalized = Boolean(rArr?.[6]);
  const successful = Boolean(rArr?.[7]);

  const label = metadataURI || `Property #${propertyId.toString()}`;

  return {
    propertyId,
    exists,
    label,
    maxShares,
    sharePriceWei,
    yieldBps,
    targetWei,
    raisedWei,
    deadline,
    finalized,
    successful,
  };
}

export async function fetchAllPropertySummaries(client: PublicClient): Promise<PropertySummary[]> {
  const ids = await fetchAllPropertyIds(client);
  if (!ids.length) return [];
  return Promise.all(ids.map((id) => fetchPropertySummary(client, id)));
}

// --- Portfolio / user holdings ---

export async function fetchUserPortfolio(client: PublicClient, user: Address): Promise<UserHolding[]> {
  const ids = await fetchAllPropertyIds(client);
  if (!ids.length) return [];

  const [balances, pendings] = await Promise.all([
    Promise.all(
      ids.map((id) =>
        client.readContract({
          address: PROPERTY_ADDRESS,
          abi: propertyAbi,
          functionName: "balanceOf",
          args: [user, id],
        })
      )
    ),
    Promise.all(
      ids.map((id) =>
        client.readContract({
          address: YIELD_VAULT_ADDRESS,
          abi: yieldVaultAbi,
          functionName: "pendingYield",
          args: [id, user],
        })
      )
    ),
  ]);

  const results: UserHolding[] = [];
  for (let i = 0; i < ids.length; i++) {
    const shares = (balances[i] ?? 0n) as bigint;
    const pendingYield = (pendings[i] ?? 0n) as bigint;
    if (shares === 0n && pendingYield === 0n) continue;
    results.push({ propertyId: ids[i], shares, pendingYield });
  }
  return results;
}

// --- Activity feed (frontend-only log scan) ---

const voteEscrowEventsAbi = [
  {
    type: "event",
    name: "VoteLocked",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "investor", type: "address" },
      { indexed: false, name: "amountWei", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "BuyTriggered",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: false, name: "totalPaidWei", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ProposalFinalized",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: false, name: "successful", type: "bool" },
    ],
  },
] as const;

const yieldVaultEventsAbi = [
  {
    type: "event",
    name: "YieldDeposited",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "YieldClaimed",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;

export async function fetchGlobalActivity(client: PublicClient): Promise<ActivityItem[]> {
  const latestBlock = await client.getBlockNumber();

  const [voteLogs, yieldLogs] = await Promise.all([
    client.getLogs({
      address: VOTE_ESCROW_ADDRESS,
      fromBlock: DEPLOY_BLOCK,
      toBlock: latestBlock,
      events: voteEscrowEventsAbi as any,
    }),
    client.getLogs({
      address: YIELD_VAULT_ADDRESS,
      fromBlock: DEPLOY_BLOCK,
      toBlock: latestBlock,
      events: yieldVaultEventsAbi as any,
    }),
  ]);

  const items: ActivityItem[] = [];

  for (const log of voteLogs) {
    const evName = (log as any).eventName as string;
    const args = (log as any).args ?? {};
    const propertyId = args.propertyId as bigint | undefined;

    if (evName === "VoteLocked") {
      items.push({ kind: "deposit", propertyId, txHash: log.transactionHash, blockNumber: log.blockNumber, args });
    } else if (evName === "BuyTriggered") {
      items.push({ kind: "finalized-success", propertyId, txHash: log.transactionHash, blockNumber: log.blockNumber, args });
    } else if (evName === "ProposalFinalized") {
      const successful = Boolean(args.successful);
      items.push({
        kind: successful ? "finalized-success" : "finalized-fail",
        propertyId,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        args,
      });
    }
  }

  for (const log of yieldLogs) {
    const evName = (log as any).eventName as string;
    const args = (log as any).args ?? {};
    const propertyId = args.propertyId as bigint | undefined;

    if (evName === "YieldDeposited") {
      items.push({ kind: "yield-deposited", propertyId, txHash: log.transactionHash, blockNumber: log.blockNumber, args });
    } else if (evName === "YieldClaimed") {
      items.push({ kind: "yield-claimed", propertyId, txHash: log.transactionHash, blockNumber: log.blockNumber, args });
    }
  }

  // Dex events
  if (
    PROPERTY_DEX_ADDRESS &&
    PROPERTY_DEX_ADDRESS !== "0x0000000000000000000000000000000000000000"
  ) {
    const buyLogs = await client.getLogs({
      address: PROPERTY_DEX_ADDRESS,
      fromBlock: DEX_DEPLOY_BLOCK,
      toBlock: latestBlock,
      topics: encodeEventTopics({ abi: propertyDexAbi as any, eventName: "SwapStableForShares" })
    });

    for (const log of buyLogs) {
      const decoded = decodeEventLog({
        abi: propertyDexAbi as any,
        data: log.data,
        topics: log.topics
      }) as any;
      const args = decoded.args;
      const propertyId = args.propertyId as bigint;
      const block = await client.getBlock({ blockHash: log.blockHash! });
      items.push({
        kind: "dex_buy",
        propertyId,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        args: {
          trader: args.trader as `0x${string}`,
          stableIn: args.stableIn as bigint,
          sharesOut: args.sharesOut as bigint
        }
      });
      items[items.length - 1].args.timestamp = Number(block.timestamp);
    }

    const sellLogs = await client.getLogs({
      address: PROPERTY_DEX_ADDRESS,
      fromBlock: DEX_DEPLOY_BLOCK,
      toBlock: latestBlock,
      topics: encodeEventTopics({ abi: propertyDexAbi as any, eventName: "SwapSharesForStable" })
    });

    for (const log of sellLogs) {
      const decoded = decodeEventLog({
        abi: propertyDexAbi as any,
        data: log.data,
        topics: log.topics
      }) as any;
      const args = decoded.args;
      const propertyId = args.propertyId as bigint;
      const block = await client.getBlock({ blockHash: log.blockHash! });
      items.push({
        kind: "dex_sell",
        propertyId,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        args: {
          trader: args.trader as `0x${string}`,
          sharesIn: args.sharesIn as bigint,
          stableOut: args.stableOut as bigint
        }
      });
      items[items.length - 1].args.timestamp = Number(block.timestamp);
    }
  }

  items.sort((a, b) => {
    const aNum = a.blockNumber ? Number(a.blockNumber) : 0;
    const bNum = b.blockNumber ? Number(b.blockNumber) : 0;
    return bNum - aNum;
  });

  return items;
}

// --- Property holders reconstruction via logs (no backend) ---

const propertyTransferEventsAbi = [
  {
    type: "event",
    name: "TransferSingle",
    inputs: [
      { indexed: true, name: "operator", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "id", type: "uint256" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TransferBatch",
    inputs: [
      { indexed: true, name: "operator", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "ids", type: "uint256[]" },
      { indexed: false, name: "values", type: "uint256[]" },
    ],
  },
] as const;

export async function fetchPropertyHolders(
  client: PublicClient,
  propertyId: bigint
): Promise<{ holder: Address; shares: bigint }[]> {
  const latest = await client.getBlockNumber();

  const logs = await client.getLogs({
    address: PROPERTY_ADDRESS,
    fromBlock: DEPLOY_BLOCK,
    toBlock: latest,
    events: propertyTransferEventsAbi as any,
  });

  const balances = new Map<Address, bigint>();

  const add = (addr: Address, amt: bigint) => balances.set(addr, (balances.get(addr) ?? 0n) + amt);
  const sub = (addr: Address, amt: bigint) => balances.set(addr, (balances.get(addr) ?? 0n) - amt);

  for (const log of logs) {
    const evName = (log as any).eventName;
    const args = (log as any).args;
    if (!args) continue;

    if (evName === "TransferSingle" && args.id === propertyId) {
      const from = args.from as Address;
      const to = args.to as Address;
      const v = args.value as bigint;
      if (from !== ZERO) sub(from, v);
      if (to !== ZERO) add(to, v);
    }

    if (evName === "TransferBatch") {
      const ids = args.ids as bigint[];
      const values = args.values as bigint[];
      const from = args.from as Address;
      const to = args.to as Address;

      ids.forEach((id: bigint, idx: number) => {
        if (id !== propertyId) return;
        const v = values[idx];
        if (from !== ZERO) sub(from, v);
        if (to !== ZERO) add(to, v);
      });
    }
  }

  return [...balances.entries()]
    .filter(([, bal]) => bal > 0n)
    .map(([holder, shares]) => ({ holder, shares }));
}

// --- Rent-to-Own helpers ---

const agreementCreatedEvent = parseAbiItem(
  "event AgreementCreated(uint256 indexed agreementId, address indexed tenant, address indexed landlord, uint256 propertyId, uint256 paymentAmount, uint256 equitySharesPerPayment, uint256 maxPayments)"
);

export async function fetchRentToOwnAgreementsForProperty(client: PublicClient, propertyId: bigint) {
  if (!RENT_TO_OWN_ADDRESS) return [];
  const logs = await client.getLogs({
    address: RENT_TO_OWN_ADDRESS,
    event: agreementCreatedEvent as any,
    fromBlock: RTO_DEPLOY_BLOCK,
    toBlock: "latest"
  });

  return logs
    .filter((log: any) => log.args.propertyId === propertyId)
    .map((log: any) => ({
      agreementId: log.args.agreementId as bigint,
      tenant: log.args.tenant as `0x${string}`,
      landlord: log.args.landlord as `0x${string}`,
      propertyId: log.args.propertyId as bigint,
      paymentAmount: log.args.paymentAmount as bigint,
      equitySharesPerPayment: log.args.equitySharesPerPayment as bigint,
      maxPayments: log.args.maxPayments as bigint
    }));
}

export async function fetchUserRentToOwnAgreements(client: PublicClient, user: `0x${string}`) {
  if (!RENT_TO_OWN_ADDRESS) return [];
  const logs = await client.getLogs({
    address: RENT_TO_OWN_ADDRESS,
    event: agreementCreatedEvent as any,
    fromBlock: RTO_DEPLOY_BLOCK,
    toBlock: "latest",
    args: { tenant: user }
  });

  return logs.map((log: any) => ({
    agreementId: log.args.agreementId as bigint,
    tenant: log.args.tenant as `0x${string}`,
    landlord: log.args.landlord as `0x${string}`,
    propertyId: log.args.propertyId as bigint,
    paymentAmount: log.args.paymentAmount as bigint,
    equitySharesPerPayment: log.args.equitySharesPerPayment as bigint,
    maxPayments: log.args.maxPayments as bigint
  }));
}


