import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from backend.services.blockchain import asset_nft
from pydantic import BaseModel, Field
from web3 import Web3

assets_router = APIRouter()

ASSETS_DIRECTORY = Path(__file__).resolve().parents[2] / "assets"

class AssetMint(BaseModel):
    name: str
    metadataURI: str
    assetType: str
    isActive: bool
    createdBy: str
    description: str

class AssetAssign(BaseModel):
    token_id: int
    did: str
    assigned_add:str

class AssetUpdateState(BaseModel):
    token_id: int
    asset_state: str

class AssetTransfer(BaseModel):
    token_id: int
    new_token_id: int
    new_owner_address: str


class AssetMetadata(BaseModel):
    token_id: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=200)
    metadata_uri: str = ""
    asset_type: str = Field(min_length=1, max_length=100)
    is_active: bool
    created_by: str
    transaction_hash: str
    description: str = "BEL Electronics digital asset"
    image: str = "assets/NFT #001.png"
    external_url: str = ""
    did: str = ""


@assets_router.post("/assets/metadata")
def save_asset_metadata(metadata: AssetMetadata):
    ASSETS_DIRECTORY.mkdir(parents=True, exist_ok=True)
    metadata_path = ASSETS_DIRECTORY / f"NFT_#{metadata.token_id:03d}.json"
    document = {
        "name": metadata.name,
        "description": metadata.description,
        "image": metadata.image,
        "external_url": metadata.external_url,
        "attributes": [
            {"trait_type": "Asset Type", "value": metadata.asset_type},
            {"trait_type": "Status", "value": "Active" if metadata.is_active else "Inactive"},
            {"trait_type": "Token ID", "value": str(metadata.token_id)},
            {"trait_type": "DID", "value": metadata.did},
        ],
        "blockchain": {
            "token_id": metadata.token_id,
            "metadata_uri": metadata.metadata_uri,
            "created_by": metadata.created_by,
            "transaction_hash": metadata.transaction_hash,
        },
    }
    metadata_path.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    return {"path": str(metadata_path.relative_to(ASSETS_DIRECTORY.parent)), "metadata": document}


@assets_router.get("/asset/{token_id}")
def get_asset(token_id:int):
    try:

        asset=asset_nft.functions.assets(token_id).call()

        return{
            "message":"We got the Asset",
            "token_id":token_id,
            "Asset":asset
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))