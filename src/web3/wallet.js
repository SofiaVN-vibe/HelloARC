import { createWalletClient, custom } from "viem";

let walletListenersInitialized = false;

function applyWalletState(address) {
  if (!window.WEB3) {
    window.WEB3 = { connected: false, address: null };
  }

  if (!address) {
    window.WEB3.connected = false;
    window.WEB3.address = null;
    window.dispatchEvent(new CustomEvent("wallet-disconnected"));
    return;
  }

  window.WEB3.connected = true;
  window.WEB3.address = address;
  window.dispatchEvent(new CustomEvent("wallet-connected", { detail: { address } }));
}

export function initWalletEvents() {
  if (walletListenersInitialized) return;
  if (!window.ethereum) return;

  walletListenersInitialized = true;
  const provider = window.ethereum;

  const handleAccountsChanged = (accounts) => {
    const address = accounts?.[0] ?? null;
    const current = window.WEB3?.address || null;

    if (!address) {
      applyWalletState(null);
      return;
    }

    if (current && current.toLowerCase() !== address.toLowerCase()) {
      // Force re-connect on wallet change
      applyWalletState(null);
      return;
    }

    applyWalletState(address);
  };

  provider.on?.("accountsChanged", handleAccountsChanged);
  provider.on?.("disconnect", () => handleAccountsChanged([]));

  provider.request?.({ method: "eth_accounts" })
    .then(handleAccountsChanged)
    .catch(() => {});
}

export async function connectWallet() {
  if (!window.ethereum) {
    alert("No wallet found. Install MetaMask or Rabby.");
    return null;
  }

  initWalletEvents();

  const client = createWalletClient({
    transport: custom(window.ethereum),
  });

  const accounts = await client.requestAddresses();
  const address = accounts?.[0] ?? null;
  applyWalletState(address);
  return address;
}
