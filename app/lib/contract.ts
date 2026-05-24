export const CONTRACT_ADDRESS =
  "0x1B980Bc67444C8D17399FcCf9AeE52F1Bf3cA3A4";

export const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
    ],
    name: "storeHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
    ],
    name: "verify",
    outputs: [
      {
        internalType: "bool",
        name: "stored",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "uploader",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
