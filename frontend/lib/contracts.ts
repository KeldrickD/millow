// Hardcoded deployed addresses (Sepolia)
function requireAddress(envName: string, fallback?: `0x${string}`): `0x${string}` {
  const fromEnv = process.env[envName] as `0x${string}` | undefined;
  const isProd = process.env.NODE_ENV === "production";
  if (fromEnv) return fromEnv;
  if (isProd && !fromEnv) {
    throw new Error(`Missing required env: ${envName} in production`);
  }
  if (fallback) return fallback;
  throw new Error(`Address for ${envName} is not configured`);
}

// Base Sepolia defaults from latest deploy (scripts/deploy.js); env overrides take precedence.
export const PROPERTY_ADDRESS = requireAddress(
  "NEXT_PUBLIC_PROPERTY_ADDRESS",
  "0xf79827CC3E2e1656cA99cc5339eBA4702b92775d"
);
export const VOTE_ESCROW_ADDRESS = requireAddress(
  "NEXT_PUBLIC_VOTE_ESCROW_ADDRESS",
  "0x68Ace3817830449D4b186815aad11C3335D9f434"
);
export const YIELD_VAULT_ADDRESS = requireAddress(
  "NEXT_PUBLIC_YIELD_VAULT_ADDRESS",
  "0x4027dE999CAc088D74077eFD425ef2FA9EecE477"
);
export const USDC_ADDRESS = requireAddress(
  "NEXT_PUBLIC_USDC_ADDRESS",
  "0x53a8139c77aCa23651Ae91c21Bd5718fC93A156A"
);
export const GOVERNANCE_ADDRESS = requireAddress(
  "NEXT_PUBLIC_GOVERNANCE_ADDRESS",
  "0x25fec55868038b302fEaC414dc6dAAfc8f23c6D3"
);
export const MOCK_USDC_ADDRESS = USDC_ADDRESS;
export const SMART_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS as `0x${string}`;
export const RENT_TO_OWN_ADDRESS = process.env.NEXT_PUBLIC_RENT_TO_OWN_ADDRESS as `0x${string}`;
export const PROPERTY_GOVERNOR_ADDRESS =
  (process.env.NEXT_PUBLIC_PROPERTY_GOVERNOR_ADDRESS as `0x${string}` | undefined) ??
  "0x0000000000000000000000000000000000000000";
export const PROPERTY_DEX_ADDRESS =
  (process.env.NEXT_PUBLIC_PROPERTY_DEX_ADDRESS as `0x${string}` | undefined) ??
  "0x0000000000000000000000000000000000000000";

// Minimal ABIs matching the MVP contracts
export const propertyAbi = [
  // views
  {
    type: "function",
    name: "uri",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "isWhitelisted",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "maxShares",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "sharePriceWei",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "propertyMetadata",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "maxShares", type: "uint256" },
      { name: "sharePriceWei", type: "uint256" },
      { name: "yieldBps", type: "uint16" },
      { name: "metadataURI", type: "string" }
    ]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "properties",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "maxShares", type: "uint256" },
      { name: "sharePriceWei", type: "uint256" },
      { name: "yieldBps", type: "uint16" },
      { name: "metadataURI", type: "string" }
    ]
  },
  {
    type: "function",
    name: "createProperty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "maxShares", type: "uint256" },
      { name: "sharePriceWei", type: "uint256" },
      { name: "yieldBps", type: "uint16" },
      { name: "metadataURI", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setWhitelisted",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "allowed", type: "bool" }
    ],
    outputs: []
  }
] as const;

export const voteEscrowAbi = [
  // views
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "seller", type: "address" },
      { name: "targetPriceWei", type: "uint256" },
      { name: "description", type: "string" },
      { name: "totalLocked", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "finalized", type: "bool" },
      { name: "successful", type: "bool" }
    ]
  },
  {
    type: "function",
    name: "getProposalStruct",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "exists", type: "bool" },
          { name: "seller", type: "address" },
          { name: "targetPriceWei", type: "uint256" },
          { name: "description", type: "string" },
          { name: "totalLocked", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "finalized", type: "bool" },
          { name: "successful", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getUserPosition",
    stateMutability: "view",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "user", type: "address" }
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "lockedWei", type: "uint256" },
          { name: "allocatedShares", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getActivePropertyIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getAllPropertyIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "lockedAmount",
    stateMutability: "view",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "investor", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "proposeProperty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "seller", type: "address" },
      { name: "targetPriceWei", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "description", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "proposePropertyByAddress",
    stateMutability: "nonpayable",
    inputs: [
      { name: "propertyAddress", type: "address" },
      { name: "seller", type: "address" },
      { name: "targetPriceWei", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "description", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  // actions
  {
    type: "function",
    name: "voteAndLock",
    stateMutability: "payable",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "amountWei", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "triggerBuy",
    stateMutability: "nonpayable",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "cancelProperty",
    stateMutability: "nonpayable",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "minGovBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  // events
  {
    type: "event",
    name: "VoteLocked",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "investor", type: "address" },
      { indexed: false, name: "amountWei", type: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "BuyTriggered",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: false, name: "totalPaidWei", type: "uint256" }
    ],
    anonymous: false
  }
] as const;

export const yieldVaultAbi = [
  { type: "function", name: "pendingYield", stateMutability: "view", inputs: [ { name: "propertyId", type: "uint256" }, { name: "user", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] },
  { type: "function", name: "claimYield", stateMutability: "nonpayable", inputs: [ { name: "propertyId", type: "uint256" } ], outputs: [] },
  { type: "function", name: "depositYield", stateMutability: "nonpayable", inputs: [ { name: "propertyId", type: "uint256" }, { name: "amount", type: "uint256" } ], outputs: [] },
  { type: "function", name: "depositYieldByAddress", stateMutability: "nonpayable", inputs: [ { name: "propertyAddress", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [] },
  { type: "function", name: "pendingYieldByAddress", stateMutability: "view", inputs: [ { name: "propertyAddress", type: "address" }, { name: "user", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] },
  { type: "function", name: "claimYieldByAddress", stateMutability: "nonpayable", inputs: [ { name: "propertyAddress", type: "address" } ], outputs: [] }
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [ { name: "account", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [ { name: "to", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [ { name: "", type: "bool" } ] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [ { name: "spender", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [ { name: "", type: "bool" } ] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [ { name: "owner", type: "address" }, { name: "spender", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [ { name: "", type: "uint8" } ] }
] as const;

export const governanceAbi = [
  { type: "function", name: "airdropEqual", stateMutability: "nonpayable", inputs: [ { name: "recipients", type: "address[]" }, { name: "amountEach", type: "uint256" } ], outputs: [] },
  { type: "function", name: "airdrop", stateMutability: "nonpayable", inputs: [ { name: "recipients", type: "address[]" }, { name: "amounts", type: "uint256[]" } ], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [ { name: "account", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] }
] as const;

export const smartEscrowAbi = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "seller", type: "address" },
      { name: "propertyId", type: "uint256" },
      { name: "totalAmount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "oracle", type: "address" },
      { name: "milestoneNames", type: "string[]" }
    ],
    outputs: [{ name: "escrowId", type: "uint256" }]
  },
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [ { name: "escrowId", type: "uint256" } ], outputs: [] },
  { type: "function", name: "ownerCompleteMilestone", stateMutability: "nonpayable", inputs: [ { name: "escrowId", type: "uint256" }, { name: "milestoneIndex", type: "uint256" } ], outputs: [] },
  { type: "function", name: "verifyMilestone", stateMutability: "nonpayable", inputs: [ { name: "escrowId", type: "uint256" }, { name: "milestoneIndex", type: "uint256" }, { name: "signature", type: "bytes" } ], outputs: [] },
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [ { name: "escrowId", type: "uint256" } ],
    outputs: [
      {
        components: [
          { name: "exists", type: "bool" },
          { name: "buyer", type: "address" },
          { name: "seller", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "totalAmount", type: "uint256" },
          { name: "deposited", type: "uint256" },
          { name: "released", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "oracle", type: "address" },
          { name: "cancelled", type: "bool" },
          { name: "fullyReleased", type: "bool" }
        ],
        name: "e",
        type: "tuple"
      },
      {
        components: [
          { name: "name", type: "string" },
          { name: "completed", type: "bool" },
          { name: "completedAt", type: "uint256" }
        ],
        name: "ms",
        type: "tuple[]"
      }
    ]
  }
] as const;

export const rentToOwnAbi = [
  {
    type: "function",
    name: "getAgreement",
    stateMutability: "view",
    inputs: [{ name: "agreementId", type: "uint256" }],
    outputs: [
      {
        components: [
          { name: "exists", type: "bool" },
          { name: "tenant", type: "address" },
          { name: "landlord", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "paymentAmount", type: "uint256" },
          { name: "equitySharesPerPayment", type: "uint256" },
          { name: "maxPayments", type: "uint256" },
          { name: "paymentsMade", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "terminated", type: "bool" }
        ],
        name: "",
        type: "tuple"
      }
    ]
  },
  {
    type: "function",
    name: "createAgreement",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tenant", type: "address" },
      { name: "landlord", type: "address" },
      { name: "propertyId", type: "uint256" },
      { name: "paymentAmount", type: "uint256" },
      { name: "equitySharesPerPayment", type: "uint256" },
      { name: "maxPayments", type: "uint256" }
    ],
    outputs: [{ name: "agreementId", type: "uint256" }]
  },
  { type: "function", name: "pay", stateMutability: "nonpayable", inputs: [ { name: "agreementId", type: "uint256" } ], outputs: [] },
  { type: "function", name: "terminate", stateMutability: "nonpayable", inputs: [ { name: "agreementId", type: "uint256" } ], outputs: [] }
] as const;

export const propertyGovernorAbi = [
  {
    type: "function",
    name: "createProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "title", type: "string" },
      { name: "description", type: "string" }
    ],
    outputs: [{ name: "proposalId", type: "uint256" }]
  },
  { type: "function", name: "castVote", stateMutability: "nonpayable", inputs: [ { name: "proposalId", type: "uint256" }, { name: "support", type: "bool" } ], outputs: [] },
  { type: "function", name: "finalizeProposal", stateMutability: "nonpayable", inputs: [ { name: "proposalId", type: "uint256" } ], outputs: [] },
  { type: "function", name: "getProposalsByProperty", stateMutability: "view", inputs: [ { name: "propertyId", type: "uint256" } ], outputs: [ { name: "", type: "uint256[]" } ] },
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "propertyId", type: "uint256" },
      { name: "proposer", type: "address" },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "forVotes", type: "uint256" },
      { name: "againstVotes", type: "uint256" },
      { name: "finalized", type: "bool" },
      { name: "succeeded", type: "bool" }
    ]
  }
] as const;

export const propertyDexAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "propertyId", type: "uint256" },
      { name: "shareReserve", type: "uint256" },
      { name: "stableReserve", type: "uint256" },
      { name: "feeBps", type: "uint16" }
    ]
  },
  {
    type: "function",
    name: "swapStableForShares",
    stateMutability: "nonpayable",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "stableIn", type: "uint256" },
      { name: "minSharesOut", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "swapSharesForStable",
    stateMutability: "nonpayable",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "shareIn", type: "uint256" },
      { name: "minStableOut", type: "uint256" }
    ],
    outputs: []
  }
] as const;

export const mockUsdcAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [ { name: "to", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [ { name: "account", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [ { name: "", type: "uint8" } ] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [ { name: "spender", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [ { name: "", type: "bool" } ] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [ { name: "owner", type: "address" }, { name: "spender", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] }
] as const;


