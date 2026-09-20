import {
    BrowserProvider,
    Contract
} from "https://cdn.jsdelivr.net/npm/ethers@6.13.5/+esm";

import {
    CONTRACTS,
    SEPOLIA_CHAIN_ID
} from "./config.js";

export function getInjectedProvider() {
    if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.find((provider) => provider.isMetaMask) || window.ethereum.providers[0];
    }

    return window.ethereum;
}

export function formatError(error) {
    if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
        return "Transaction rejected in MetaMask.";
    }

    if (error?.code === -32002) {
        return "A MetaMask request is already pending. Please approve or open MetaMask.";
    }

    return error?.shortMessage || error?.reason || error?.message || "Blockchain request failed.";
}

export function shortAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function ensureSepolia() {
    const ethereum = getInjectedProvider();

    if (!ethereum) {
        throw new Error("MetaMask is not installed.");
    }

    const chainId = await ethereum.request({ method: "eth_chainId" });

    if (chainId.toLowerCase() !== SEPOLIA_CHAIN_ID) {
        try {
            await ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: SEPOLIA_CHAIN_ID }]
            });
        } catch (error) {
            if (error?.code === 4902) {
                await ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: SEPOLIA_CHAIN_ID,
                        chainName: "Sepolia",
                        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
                        rpcUrls: ["https://rpc.sepolia.org"],
                        blockExplorerUrls: ["https://sepolia.etherscan.io"]
                    }]
                });
            } else {
                throw new Error("Please switch MetaMask to Sepolia to continue.");
            }
        }
    }
}

export async function getProvider() {
    const ethereum = getInjectedProvider();

    if (!ethereum) {
        throw new Error("MetaMask not installed.");
    }

    await ensureSepolia();
    return new BrowserProvider(ethereum);
}

export async function connectBlockchainWallet() {
    const ethereum = getInjectedProvider();

    if (!ethereum) {
        throw new Error("MetaMask is not installed in this browser.");
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts?.length) {
        throw new Error("No wallet account was selected.");
    }

    await ensureSepolia();

    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return { provider, signer, address, accounts };
}

export async function getContract(address, abi, signer = true) {
    const runner = signer ? await (async () => {
        const { signer: walletSigner } = await connectBlockchainWallet();
        return walletSigner;
    })() : await getProvider();

    const provider = signer ? runner.provider : runner;
    const code = await provider.getCode(address);

    if (code === "0x") {
        throw new Error(`No contract deployed at ${address} on Sepolia.`);
    }

    return new Contract(address, abi, runner);
}

export async function getContractByName(name, abi, signer = true) {
    const address = CONTRACTS[name];

    if (!address || address === "0x0000000000000000000000000000000000000000") {
        throw new Error(`Contract address for ${name} is not configured yet. Add it in config.js once deployed.`);
    }

    return getContract(address, abi, signer);
}

export async function readContract(name, abi, method, ...args) {
    const contract = await getContractByName(name, abi, false);
    return contract[method](...args);
}

export async function writeContract(name, abi, method, ...args) {
    const contract = await getContractByName(name, abi, true);
    return contract[method](...args);
}
