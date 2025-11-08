// Hardcoded deployed addresses (Sepolia)
export const PROPERTY_ADDRESS = "0xd85E6bbf4DfbccF4b2a56333aEFaEDc663110bBe" as const;
export const VOTE_ESCROW_ADDRESS = "0xF0e7017C05DD6F35C5C91E17b0e76abb5C47CED1" as const;
export const YIELD_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_YIELD_VAULT_ADDRESS as `0x${string}` | undefined) ?? "0xbB5Ca958CC2C874aC712Bc97636a1545DE67F915";
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}` | undefined) ?? "0x8289173Dba9D5D31F9D58A455E694A09f6447335";
export const MOCK_USDC_ADDRESS = USDC_ADDRESS;

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
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [ { name: "spender", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [ { name: "", type: "bool" } ] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [ { name: "owner", type: "address" }, { name: "spender", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [ { name: "", type: "uint8" } ] }
] as const;

export const mockUsdcAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [ { name: "to", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [ { name: "account", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [ { name: "", type: "uint8" } ] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [ { name: "spender", type: "address" }, { name: "amount", type: "uint256" } ], outputs: [ { name: "", type: "bool" } ] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [ { name: "owner", type: "address" }, { name: "spender", type: "address" } ], outputs: [ { name: "", type: "uint256" } ] }
] as const;


