import { ensureSepolia, formatError, getInjectedProvider } from "./contracts.js";

const button = document.getElementById("pageConnectWallet");
const status = document.getElementById("pageWalletStatus");

function shortAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function connect() {
    try {
        const ethereum = getInjectedProvider();
        if (!ethereum) throw new Error("MetaMask is not detected in this tab.");
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        await ensureSepolia();
        status.innerText = `Connected: ${shortAddress(accounts[0])}`;
    } catch (error) {
        status.innerText = formatError(error);
    }
}

button?.addEventListener("click", connect);

const ethereum = getInjectedProvider();
if (ethereum) {
    ethereum.on("accountsChanged", (accounts) => {
        status.innerText = accounts.length ? `Connected: ${shortAddress(accounts[0])}` : "Wallet disconnected.";
    });
}
