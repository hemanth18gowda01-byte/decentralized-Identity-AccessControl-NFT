import {
    connectBlockchainWallet,
    formatError,
    shortAddress
} from "./contracts.js";

const connectButton = document.getElementById("connectWallet");
const walletStatus = document.getElementById("walletStatus");

async function connectWallet() {
    if (!connectButton) return;

    try {
        connectButton.disabled = true;
        connectButton.textContent = "Connecting...";
        walletStatus.textContent = "Requesting wallet access...";

        const { address } = await connectBlockchainWallet();

        walletStatus.textContent = `Connected: ${shortAddress(address)}`;
        connectButton.textContent = "Open Dashboard";
        connectButton.classList.add("success");
        connectButton.disabled = false;

        connectButton.onclick = () => {
            window.location.href = "dashboard.html";
        };

        window.app = window.app || {};
        window.app.walletAddress = address;
    } catch (error) {
        walletStatus.textContent = formatError(error);
        connectButton.textContent = "Connect MetaMask";
        connectButton.disabled = false;
        connectButton.classList.remove("success");
        console.error("Wallet connection failed:", error);
    }
}

connectButton?.addEventListener("click", connectWallet);

if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (!accounts.length) {
            walletStatus.textContent = "Wallet disconnected.";
            connectButton.textContent = "Connect MetaMask";
            connectButton.classList.remove("success");
            return;
        }

        walletStatus.textContent = `Connected: ${shortAddress(accounts[0])}`;
    });
}

