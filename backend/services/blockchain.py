import json
import os
from pathlib import Path

from web3 import Web3

RPC_URL = os.getenv("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
w3 = Web3(Web3.HTTPProvider(RPC_URL))

IDENTITY_REGISTRY_ADDRESS = os.getenv(
    "IDENTITY_REGISTRY_ADDRESS",
    "0xCbf2f3fEd1Af81c816F1C6B5219d0779bd50e758",
)
ACCESS_CONTROL_ADDRESS = os.getenv(
    "ACCESS_CONTROL_ADDRESS",
    "0x463C2C1f72a5593615881B0040c2F80fB4815c3f",
)
ASSET_NFT_ADDRESS = os.getenv(
    "ASSET_NFT_ADDRESS",
    "0xfb8c47c3bE943601d23ECae90194adb22752C16d",
)

# load ABI
def load_abi(filename, fallback_filename):
    BASE_DIR = Path(__file__).resolve().parents[2]
    artifact_path = BASE_DIR / "out" / filename
    if not artifact_path.exists():
        artifact_path = BASE_DIR / "frontend" / "abi" / fallback_filename

    with artifact_path.open("r", encoding="utf-8") as file:
        contract_data = json.load(file)

    return contract_data.get("abi", contract_data)

identity_abi = load_abi("IdentityRegistry.sol/Identity.json", "Identity.json")
access_control_abi = load_abi("AccessControl.sol/AccessControl.json", "AccessControl.json")
asset_nft_abi = load_abi("AssetNFT.sol/DigitalAssetNFT.json", "AssetNFT.json")

#create contract objects
identity_registry=w3.eth.contract(
    address=Web3.to_checksum_address(IDENTITY_REGISTRY_ADDRESS),
    abi=identity_abi
)

access_control=w3.eth.contract(
    address=Web3.to_checksum_address(ACCESS_CONTROL_ADDRESS),
    abi=access_control_abi
)

asset_nft=w3.eth.contract(
    address=Web3.to_checksum_address(ASSET_NFT_ADDRESS),
    abi=asset_nft_abi
)

def blockchain_connected():
    return w3.is_connected()