import { CONTRACTS, SEPOLIA_EXPLORER } from "./config.js";
import { getContract, formatError } from "./contracts.js";
import accessArtifact from "../abi/AccessControl.json" with { type: "json" };
import assetArtifact from "../abi/AssetNFT.json" with { type: "json" };

const accessABI = accessArtifact.abi || accessArtifact;
const assetABI = assetArtifact.abi || assetArtifact;
const status = document.getElementById("accessStatus");

const addressForRole = () => (
    document.getElementById("roleAddress").value.trim()
    || document.getElementById("assignAddress").value.trim()
);

function showError(error) {
    status.innerText = formatError(error);
    console.error(error);
}

function txMessage(message, hash) {
    status.innerHTML = `${message} <a href="${SEPOLIA_EXPLORER}/tx/${hash}" target="_blank" rel="noreferrer">View transaction</a>`;
}

function showResult(panelId, message, details = [], hash = "") {
    const panel = document.getElementById(panelId);
    panel.classList.add("is-visible");
    panel.querySelector(".result-message").textContent = message;
    panel.querySelector(".result-data").textContent = details.join("\n");
    const link = panel.querySelector(".result-link");
    link.textContent = hash ? "View on Etherscan" : "";
    link.href = hash ? SEPOLIA_EXPLORER + "/tx/" + hash : "#";
}

async function readContracts() {
    return Promise.all([
        getContract(CONTRACTS.accessControl, accessABI),
        getContract(CONTRACTS.assetNFT, assetABI)
    ]);
}

async function readManagedState(contract, address, permission) {
    const [role, permitted] = await Promise.all([
        contract.role(address),
        contract.hasPermission(address, permission)
    ]);
    return { role: Number(role), permitted };
}

async function writeContracts() {
    status.innerText = "Requesting wallet signature access...";
    const access = await getContract(CONTRACTS.accessControl, accessABI);
    const asset = await getContract(CONTRACTS.assetNFT, assetABI);
    const caller = (await access.runner.getAddress()).toLowerCase();
    const [accessOwner, assetOwner] = await Promise.all([access.OWNER(), asset.OWNER()]);
    if (accessOwner.toLowerCase() !== caller) {
        throw new Error("Connected wallet is not the AccessControl owner. On-chain owner: " + accessOwner + "; connected: " + caller);
    }
    if (assetOwner.toLowerCase() !== caller) {
        throw new Error("Connected wallet is not the AssetNFT owner. On-chain owner: " + assetOwner + "; connected: " + caller);
    }
    return [access, asset];
}

async function checkRole() {
    try {
        const address = addressForRole();
        if (!address) throw new Error("Enter a wallet address.");
        const [access, asset] = await readContracts();
        const [accessRole, assetRole] = await Promise.all([
            access.getRole(address),
            asset.getRole(address)
        ]);
        const names = ["NONE", "ADMIN", "MANAGER", "AUDITOR", "EMPLOYEE"];
        showResult("roleResult", "Role lookup complete", ["AccessControl: " + (names[Number(accessRole)] || accessRole), "AssetNFT: " + (names[Number(assetRole)] || assetRole)]);
    } catch (error) {
        showError(error);
    }
}

async function checkPermission() {
    try {
        const address = document.getElementById("permissionAddress").value.trim();
        if (!address) throw new Error("Enter a wallet address.");
        const [access, asset] = await readContracts();
        const permission = document.getElementById("grantPermission").value;
        const accessArgs = access.interface.getFunction("hasPermission").inputs.length === 2 ? [address, permission] : [address];
        const assetArgs = asset.interface.getFunction("hasPermission").inputs.length === 2 ? [address, permission] : [address];
        const [accessResult, assetResult] = await Promise.all([
            access.hasPermission(...accessArgs),
            asset.hasPermission(...assetArgs)
        ]);
        const names = ["NONE", "CREATE_ASSET", "ALLOCATE_ASSET", "TRANSFER_ASSET", "VIEW_ASSET", "AUDIT", "MANAGE_EMPLOYEES"];
        const formatPermission = (result) => Array.isArray(result) ? `${result[0]} ${names[Number(result[1])] || result[1]}` : String(result);
        showResult("permissionResult", "Permission lookup complete", ["AccessControl: " + formatPermission(accessResult), "AssetNFT: " + formatPermission(assetResult)]);
    } catch (error) {
        showError(error);
    }
}

async function checkRoleDetails() {
    try {
        const address = document.getElementById("permissionAddress").value.trim();
        if (!address) throw new Error("Enter a wallet address.");
        const [access, asset] = await readContracts();
        const [accessResult, assetResult] = await Promise.all([access.hasRole(address), asset.hasRole(address)]);
        showResult("permissionResult", "Role details loaded", ["AccessControl: " + accessResult[0] + " (role " + accessResult[1] + ")", "AssetNFT: " + assetResult[0] + " (role " + assetResult[1] + ")"]);
    } catch (error) {
        showError(error);
    }
}

async function checkOwner() {
    try {
        const [access, asset] = await readContracts();
        const [accessOwner, assetOwner] = await Promise.all([access.OWNER(), asset.OWNER()]);
        showResult("ownerResult", "Contract owners loaded", ["AccessControl: " + accessOwner, "AssetNFT: " + assetOwner]);
    } catch (error) {
        showError(error);
    }
}

async function assignRole() {
    try {
        const address = addressForRole();
        if (!address) throw new Error("Enter a wallet address.");
        const role = document.getElementById("assignRole").value;
        const permission = document.getElementById("rolePermission").value;
        const [access, asset] = await writeContracts();

        let lastHash = "";
        for (const [name, contract] of [["AccessControl", access], ["AssetNFT", asset]]) {
            const inputs = contract.interface.getFunction("assignRole").inputs.length;
            const args = inputs === 3 ? [address, role, permission] : [address, role];
            const tx = await contract.assignRole(...args);
            lastHash = tx.hash;
            txMessage(`${name} role submitted.`, tx.hash);
            await tx.wait();
        }
        const [accessState, assetState] = await Promise.all([
            readManagedState(access, address, permission),
            readManagedState(asset, address, permission)
        ]);
        showResult("assignRoleResult", "Role configured successfully", ["Address: " + address, "AccessControl role: " + accessState.role, "AssetNFT role: " + assetState.role, "Permission " + permission + ": " + accessState.permitted, "Latest transaction: " + lastHash], lastHash);
    } catch (error) {
        showError(error);
    }
}

async function grantPermission() {
    try {
        const address = document.getElementById("grantAddress").value.trim();
        if (!address) throw new Error("Enter a wallet address.");
        const permission = document.getElementById("grantPermission").value;
        const [access, asset] = await writeContracts();

        let lastHash = "";
        for (const [name, contract] of [["AccessControl", access], ["AssetNFT", asset]]) {
            const tx = await contract.grantPermission(address, permission);
            lastHash = tx.hash;
            txMessage(`${name} permission submitted.`, tx.hash);
            await tx.wait();
        }
        const [accessState, assetState] = await Promise.all([
            readManagedState(access, address, permission),
            readManagedState(asset, address, permission)
        ]);
        showResult("grantPermissionResult", "Permission granted successfully", ["Address: " + address, "Permission " + permission + " AccessControl: " + accessState.permitted, "Permission " + permission + " AssetNFT: " + assetState.permitted, "Latest transaction: " + lastHash], lastHash);
    } catch (error) {
        showError(error);
    }
}

async function revokePermission() {
    try {
        const address = document.getElementById("revokeAddress").value.trim();
        if (!address) throw new Error("Enter a wallet address.");
        const [access, asset] = await writeContracts();

        const permission = document.getElementById("revokePermission").value;
        let lastHash = "";
        for (const [name, contract] of [["AccessControl", access], ["AssetNFT", asset]]) {
            const args = contract.interface.getFunction("revokePermission").inputs.length === 2
                ? [address, permission]
                : [address];
            const tx = await contract.revokePermission(...args);
            lastHash = tx.hash;
            txMessage(`${name} permission revoke submitted.`, tx.hash);
            await tx.wait();
        }
        const [accessState, assetState] = await Promise.all([
            readManagedState(access, address, permission),
            readManagedState(asset, address, permission)
        ]);
        showResult("revokePermissionResult", "Permission revoked successfully", ["Address: " + address, "Permission " + permission + " AccessControl: " + accessState.permitted, "Permission " + permission + " AssetNFT: " + assetState.permitted, "Latest transaction: " + lastHash], lastHash);
    } catch (error) {
        showError(error);
    }
}

async function removeRole() {
    try {
        const address = document.getElementById("removeRoleAddress").value.trim();
        if (!address) throw new Error("Enter a wallet address.");
        const [access, asset] = await writeContracts();

        let lastHash = "";
        for (const [name, contract] of [["AccessControl", access], ["AssetNFT", asset]]) {
            const tx = await contract.removeRole(address);
            lastHash = tx.hash;
            txMessage(`${name} role removal submitted.`, tx.hash);
            await tx.wait();
        }
        const [accessRole, assetRole] = await Promise.all([access.role(address), asset.role(address)]);
        showResult("removeRoleResult", "Role removed successfully", ["Address: " + address, "AccessControl role: " + Number(accessRole), "AssetNFT role: " + Number(assetRole), "Latest transaction: " + lastHash], lastHash);
    } catch (error) {
        showError(error);
    }
}

document.getElementById("checkRoleButton").addEventListener("click", checkRole);
document.getElementById("checkPermissionButton").addEventListener("click", checkPermission);
document.getElementById("checkRoleDetailsButton").addEventListener("click", checkRoleDetails);
document.getElementById("checkOwnerButton").addEventListener("click", checkOwner);
document.getElementById("assignRoleButton").addEventListener("click", assignRole);
document.getElementById("grantPermissionButton").addEventListener("click", grantPermission);
document.getElementById("revokePermissionButton").addEventListener("click", revokePermission);
document.getElementById("removeRoleButton").addEventListener("click", removeRole);
