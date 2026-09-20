from fastapi import APIRouter,HTTPException
from backend.services.blockchain import access_control
from pydantic import BaseModel
from web3 import Web3

access_router = APIRouter()

class Access(BaseModel):
    address: str
    role: str
    permission: str

class GrantPermission(BaseModel):
    address: str
    permission: str

class RevokePermission(BaseModel):
    address: str

class RemoveRole(BaseModel):
    address: str


@access_router.get("/access/{address}")
def get_access(address:str):
    try:

        address=Web3.to_checksum_address(address)

        access=access_control.functions.role(address).call()

        return{
            "message":"We got the Access",
            "address":address,
            "Access":access
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))