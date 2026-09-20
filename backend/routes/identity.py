from fastapi import APIRouter,HTTPException
from backend.services.blockchain import identity_registry
from pydantic import BaseModel
from web3 import Web3

identity_router = APIRouter()

class IdentityCreation(BaseModel):
    did: str
    documentHash: str
    entityType: str
    registeredAt: int
    address: str

class IdentityUpdate(BaseModel):
    address: str
    documentHash: str
    entityType: str


@identity_router.get("/identity/{address}")
def get_identity(address:str):
    try:
        address=Web3.to_checksum_address(address)

        identity=identity_registry.functions.getIdentities(address).call()

        return{
            "message":"We got the Identity",
            "address":address,
            "Identity":identity
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
