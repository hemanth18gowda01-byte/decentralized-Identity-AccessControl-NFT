import os
from fileinput import filename
from web3 import Web3
import json
from pathlib import Path
# import os

#Connect to Anvil
RPC_URL = os.getenv("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
w3=Web3(Web3.HTTPProvider(RPC_URL))

# contract address
IDENTITY_REGISTRY_ADDRESS="0xaf970db1000ad23f477381efd1279d355165714c"
ACCESS_CONTROL_ADDRESS="0x556830f92592fbf565879217743a8d16fe2ab039"
ASSET_NFT_ADDRESS="0x3128a7a9bd22c031d063c4914a28f7f999b9cb87"

# load ABI
def load_abi(filename):
    # path = os.path.join(
    #     os.path.dirname(__file__),
    #     "..",
    #     "out",
    #     filename
    # )
    BASE_DIR = Path(__file__).resolve().parents[2]
    with open(BASE_DIR / "out" / filename, "r", encoding="utf-8") as file:
        contract_data = json.load(file)

    return contract_data["abi"]

#load all ABIs
identity_abi=load_abi("IdentityRegistry.sol/Identity.json")
access_control_abi=load_abi("AccessControl.sol/AccessControl.json")
asset_nft_abi=load_abi("AssetNFT.sol/DigitalAssetNFT.json")

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