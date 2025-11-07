// Hardcoded deployed addresses (Sepolia)
export const PROPERTY_ADDRESS = "0x608e43634924623F704b41a27bFfD20a4524A030" as const;
export const VOTE_ESCROW_ADDRESS = "0xDaac7c27355c9ef5143Af9979fe4aff9B1088Ad2" as const;

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
    name: "lockedAmount",
    stateMutability: "view",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "investor", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
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


