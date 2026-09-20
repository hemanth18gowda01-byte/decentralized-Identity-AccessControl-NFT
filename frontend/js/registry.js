import identityArtifact from "../abi/Identity.json" with { type: "json" };
import { apiDelete, apiGet, apiPost, apiUpload } from "./api.js";
import { CONTRACTS } from "./config.js";
import { ensureSepolia, formatError, getContract, getInjectedProvider } from "./contracts.js";

const identityABI = identityArtifact.abi || identityArtifact;
const button = document.getElementById("completeRegistryButton");
const resultPanel = document.getElementById("completeRegistryResult");

function managementResult(id, message, details = []) {
    const panel = document.getElementById(id);
    panel.classList.add("is-visible");
    panel.textContent = [message, ...details].join("\n");
}

function showResult(message, details = []) {
    resultPanel.classList.add("is-visible");
    resultPanel.querySelector(".result-message").textContent = message;
    resultPanel.querySelector(".result-data").textContent = details.join("\n");
}

function selectedFiles() {
    return [
        ["aadhaar", document.getElementById("registryAadhaar").files[0]],
        ["pan", document.getElementById("registryPan").files[0]],
        ["degree", document.getElementById("registryDegree").files[0]],
        ["bank_account", document.getElementById("registryBank").files[0]]
    ].filter(([, file]) => file);
}

async function authenticate(address) {
    const nonceResponse = await apiGet(`/auth/nonce?address=${encodeURIComponent(address)}`);
    const ethereum = getInjectedProvider();
    const typedData = {
        types: {
            EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" }
            ],
            Login: [
                { name: "wallet", type: "address" },
                { name: "nonce", type: "bytes32" },
                { name: "expiresAt", type: "uint256" }
            ]
        },
        primaryType: "Login",
        domain: {
            name: "SIH Secure Identity",
            version: "1",
            chainId: 11155111,
            verifyingContract: CONTRACTS.identity
        },
        message: {
            wallet: address,
            nonce: nonceResponse.nonce,
            expiresAt: nonceResponse.expiresAt
        }
    };
    const signature = await ethereum.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData)]
    });
    const session = await apiPost("/auth/verify", { address, signature });
    sessionStorage.setItem("identity_access_token", session.access_token);
    sessionStorage.setItem("identity_auth_address", address.toLowerCase());
}

async function ensureAuthenticated() {
    const ethereum = getInjectedProvider();
    if (!ethereum) throw new Error("MetaMask is not detected.");
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts.length) throw new Error("Connect a wallet first.");

    const address = accounts[0];
    const savedAddress = sessionStorage.getItem("identity_auth_address");
    const savedToken = sessionStorage.getItem("identity_access_token");
    if (!savedToken || savedAddress !== address.toLowerCase()) {
        await authenticate(address);
    }
}

async function registerCompleteIdentity() {
    const ethereum = getInjectedProvider();
    if (!ethereum) throw new Error("MetaMask is not detected.");
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts.length) throw new Error("Connect a wallet first.");
    const address = accounts[0];
    const did = document.getElementById("registryDid").value.trim();
    const files = selectedFiles();
    if (!did) throw new Error("Enter a DID.");

    await authenticate(address);
    showResult("Saving encrypted profile in SQL...");

    const profile = {
        did,
        name: document.getElementById("registryName").value.trim(),
        age: Number(document.getElementById("registryAge").value),
        phone: document.getElementById("registryPhone").value.trim(),
        email: document.getElementById("registryEmail").value.trim(),
        documents: files.map(([type, file]) => ({ type, filename: file.name }))
    };
    const databaseRecord = await apiPost("/secure/identity", profile);

    showResult("Confirming blockchain registry transaction in MetaMask...");
    await ensureSepolia();
    const contract = await getContract(CONTRACTS.identity, identityABI);
    const transaction = await contract.registerIdentities(
        did,
        `0x${databaseRecord.document_hash}`,
        document.getElementById("registryEntityType").value,
        Math.floor(Date.now() / 1000),
        address
    );
    await transaction.wait();

    const uploaded = [];
    for (const [type, file] of files) {
        const formData = new FormData();
        formData.append("document_type", type);
        formData.append("file", file);
        const documentRecord = await apiUpload(`/secure/identity/${encodeURIComponent(did)}/documents`, formData);
        uploaded.push(`${type}: document #${documentRecord.document_id}`);
    }

    showResult("Complete registry created", [
        `DID: ${did}`,
        `Wallet: ${address}`,
        `Database hash: 0x${databaseRecord.document_hash}`,
        `Blockchain transaction: ${transaction.hash}`,
        ...uploaded
    ]);
}

button?.addEventListener("click", async () => {
    button.disabled = true;
    try {
        await registerCompleteIdentity();
    } catch (error) {
        showResult("Registry creation failed", [formatError(error)]);
    } finally {
        button.disabled = false;
    }
});

document.getElementById("personalDetailsButton")?.addEventListener("click", () => {
    document.getElementById("personalDetailsSection").scrollIntoView({ behavior: "smooth" });
    document.getElementById("registryDid").focus();
});

document.getElementById("viewDetailsButton")?.addEventListener("click", async () => {
    const did = document.getElementById("viewDetailsDid").value.trim();
    if (!did) return managementResult("viewDetailsResult", "Enter a DID first.");
    try {
        await ensureAuthenticated();
        const details = await apiGet(`/secure/identity/${encodeURIComponent(did)}`);
        managementResult("viewDetailsResult", "Personal details found", [JSON.stringify(details, null, 2)]);
    } catch (error) {
        managementResult("viewDetailsResult", "Could not view details", [formatError(error)]);
    }
});

document.getElementById("updateDetailsButton")?.addEventListener("click", async () => {
    const did = document.getElementById("updateDetailsDid").value.trim();
    const profile = {
        did,
        name: document.getElementById("updateDetailsName").value.trim(),
        age: Number(document.getElementById("updateDetailsAge").value),
        phone: document.getElementById("updateDetailsPhone").value.trim(),
        email: document.getElementById("updateDetailsEmail").value.trim(),
        documents: []
    };
    if (!did) return managementResult("updateDetailsResult", "Enter a DID first.");
    try {
        await ensureAuthenticated();
        const result = await apiPost("/secure/identity", profile);
        managementResult("updateDetailsResult", "Personal details updated", [JSON.stringify(result, null, 2)]);
    } catch (error) {
        managementResult("updateDetailsResult", "Could not update details", [formatError(error)]);
    }
});

document.getElementById("deleteDetailsButton")?.addEventListener("click", async () => {
    const did = document.getElementById("deleteDetailsDid").value.trim();
    if (!did) return managementResult("deleteDetailsResult", "Enter a DID first.");
    if (!window.confirm("Delete the private SQL profile and encrypted documents?")) return;
    try {
        await ensureAuthenticated();
        const result = await apiDelete(`/secure/identity/${encodeURIComponent(did)}`);
        managementResult("deleteDetailsResult", "Personal details deleted", [JSON.stringify(result, null, 2)]);
    } catch (error) {
        managementResult("deleteDetailsResult", "Could not delete details", [formatError(error)]);
    }
});