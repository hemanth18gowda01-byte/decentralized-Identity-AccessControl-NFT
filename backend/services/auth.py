import os
import secrets
import time

from eth_account import Account
from eth_account.messages import encode_typed_data
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from database.database import create_session, save_challenge, take_challenge, session_address

router = APIRouter()

EIP712_DOMAIN = {
    "name": "SIH Secure Identity",
    "version": "1",
    "chainId": int(os.getenv("EIP712_CHAIN_ID", "11155111")),
    "verifyingContract": os.getenv(
        "EIP712_VERIFYING_CONTRACT",
        "0xaF970db1000Ad23f477381eFd1279D355165714C",
    ),
}
EIP712_TYPES = {
    "Login": [
        {"name": "wallet", "type": "address"},
        {"name": "nonce", "type": "bytes32"},
        {"name": "expiresAt", "type": "uint256"},
    ]
}


class SignatureVerification(BaseModel):
    address: str
    signature: str


@router.get("/auth/nonce")
def get_nonce(address: str):
    address = address.lower()
    nonce = f"0x{secrets.token_hex(32)}"
    expires_at = int(time.time()) + 300
    save_challenge(address, nonce, expires_at)
    return {"address": address, "nonce": nonce, "expiresAt": expires_at}


@router.post("/auth/verify")
def verify_signature(request: SignatureVerification):
    address = request.address.lower()
    challenge = take_challenge(address)
    if not challenge or challenge[1] < int(time.time()):
        raise HTTPException(status_code=401, detail="Challenge expired or not found")

    typed_data = {
        "types": {"EIP712Domain": [
            {"name": "name", "type": "string"},
            {"name": "version", "type": "string"},
            {"name": "chainId", "type": "uint256"},
            {"name": "verifyingContract", "type": "address"},
        ], **EIP712_TYPES},
        "primaryType": "Login",
        "domain": EIP712_DOMAIN,
        "message": {
            "wallet": address,
            "nonce": challenge[0],
            "expiresAt": challenge[1],
        },
    }

    try:
        recovered = Account.recover_message(
            encode_typed_data(full_message=typed_data), signature=request.signature
        ).lower()
    except Exception as error:
        raise HTTPException(status_code=401, detail="Invalid signature") from error

    if recovered != address:
        raise HTTPException(status_code=401, detail="Signature does not match address")

    return {"access_token": create_session(address), "token_type": "bearer"}


def authenticated_address(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    address = session_address(authorization[7:].strip())
    if not address:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return address
