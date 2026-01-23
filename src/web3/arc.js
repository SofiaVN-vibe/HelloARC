import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits, defineChain } from "viem";

export const ARC_TESTNET = {
  chainId: 5042002,
  chainIdHex: "0x4cef52",
  name: "Arc Testnet",
  rpcUrls: ["https://rpc.testnet.arc.network"],
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

export const ARC_TESTNET_CHAIN = defineChain({
  id: ARC_TESTNET.chainId,
  name: ARC_TESTNET.name,
  nativeCurrency: ARC_TESTNET.nativeCurrency,
  rpcUrls: {
    default: { http: ARC_TESTNET.rpcUrls },
    public: { http: ARC_TESTNET.rpcUrls },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: ARC_TESTNET.blockExplorerUrls[0] },
  },
});

export const USDC = {
  // Arc Docs: Optional ERC-20 interface for native USDC balance (uses 6 decimals)
  address: "0x3600000000000000000000000000000000000000",
  decimals: 6,
  symbol: "USDC",
  abi: [
    {
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
    },
    {
      type: "function",
      name: "decimals",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint8" }],
    },
    {
      type: "function",
      name: "transfer",
      stateMutability: "nonpayable",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
  ],
};

export function getPublicClient() {
  return createPublicClient({
    transport: http(ARC_TESTNET.rpcUrls[0]),
  });
}

export function getWalletClient() {
  return createWalletClient({
    chain: ARC_TESTNET_CHAIN,
    transport: custom(window.ethereum),
  });
}

export async function ensureArcTestnet() {
  if (!window.ethereum) throw new Error("No wallet found");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainIdHex }],
    });
  } catch (err) {
    // If chain not added yet -> add it
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ARC_TESTNET.chainIdHex,
            chainName: ARC_TESTNET.name,
            rpcUrls: ARC_TESTNET.rpcUrls,
            nativeCurrency: ARC_TESTNET.nativeCurrency,
            blockExplorerUrls: ARC_TESTNET.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function readUsdcBalance(address) {
  const publicClient = getPublicClient();
  try {
    const nativeBal = await publicClient.getBalance({ address });
    return formatUnits(nativeBal, ARC_TESTNET.nativeCurrency.decimals);
  } catch (err) {
    const bal = await publicClient.readContract({
      address: USDC.address,
      abi: USDC.abi,
      functionName: "balanceOf",
      args: [address],
    });
    return formatUnits(bal, USDC.decimals);
  }
}

export async function sendUsdc(to, amountFloatStr) {
  // amountFloatStr e.g. "1", "5", "10"
  await ensureArcTestnet();

  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const amount = parseUnits(amountFloatStr, ARC_TESTNET.nativeCurrency.decimals);
  try {
    const hash = await walletClient.sendTransaction({
      account,
      to,
      value: amount,
    });
    return hash;
  } catch (err) {
    const hash = await walletClient.writeContract({
      account,
      address: USDC.address,
      abi: USDC.abi,
      functionName: "transfer",
      args: [to, parseUnits(amountFloatStr, USDC.decimals)],
    });
    return hash;
  }
}
