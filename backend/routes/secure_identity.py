import hashlib

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from backend.services.auth import authenticated_address
from backend.services.encryption import decrypt_data, decrypt_json, encrypt_data, encrypt_json
from database.database import (
    get_document,
    get_identity,
    save_document,
    save_identity,
    delete_identity,
    write_audit_log,
)


secure_identity_router = APIRouter(prefix="/secure", tags=["secure identity"])


class IdentityProfile(BaseModel):
    did: str = Field(min_length=3, max_length=200)
    name: str = Field(min_length=1, max_length=200)
    age: int = Field(ge=0, le=150)
    phone: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=3, max_length=254)
    documents: list[dict[str, str]] = Field(default_factory=list)


def identity_aad(did: str) -> bytes:
    return f"identity:{did}".encode("utf-8")


def document_aad(did: str, document_type: str) -> bytes:
    return f"document:{did}:{document_type}".encode("utf-8")


@secure_identity_router.post("/identity")
def create_or_update_identity(
    profile: IdentityProfile, address: str = Depends(authenticated_address)
):
    existing = get_identity(profile.did)
    if existing and existing["wallet_address"] != address:
        raise HTTPException(status_code=403, detail="This DID belongs to another wallet")

    payload = profile.model_dump()
    if existing and not payload["documents"]:
        previous_payload = decrypt_json(
            existing["nonce"],
            existing["ciphertext"],
            identity_aad(profile.did),
        )
        payload["documents"] = previous_payload.get("documents", [])

    for document in payload["documents"]:
        if "content" in document or "base64" in document:
            raise HTTPException(
                status_code=400,
                detail="Upload documents to private object storage; do not put file bytes in this API",
            )

    encrypted = encrypt_json(payload, identity_aad(profile.did))
    save_identity(
        profile.did,
        address,
        encrypted["nonce"],
        encrypted["ciphertext"],
    )
    return {"did": profile.did, "document_hash": hashlib.sha256(encrypted["ciphertext"].encode()).hexdigest()}


@secure_identity_router.get("/identity/{did}")
def read_identity(did: str, address: str = Depends(authenticated_address)):
    record = get_identity(did)
    if not record:
        raise HTTPException(status_code=404, detail="Identity not found")
    if record["wallet_address"] != address:
        raise HTTPException(status_code=403, detail="You are not authorized to view this identity")

    write_audit_log(address, did, "read_identity")
    return decrypt_json(record["nonce"], record["ciphertext"], identity_aad(did))


@secure_identity_router.delete("/identity/{did}")
def remove_identity(did: str, address: str = Depends(authenticated_address)):
    record = get_identity(did)
    if not record:
        raise HTTPException(status_code=404, detail="Identity not found")
    if record["wallet_address"] != address:
        raise HTTPException(status_code=403, detail="You are not authorized to delete this identity")

    delete_identity(did)
    write_audit_log(address, did, "delete_identity")
    return {"message": "Private identity data and encrypted documents deleted", "did": did}


@secure_identity_router.post("/identity/{did}/documents")
async def upload_document(
    did: str,
    document_type: str,
    file: UploadFile = File(...),
    address: str = Depends(authenticated_address),
):
    record = get_identity(did)
    if not record or record["wallet_address"] != address:
        raise HTTPException(status_code=403, detail="You are not authorized for this identity")
    if document_type.lower() in {"fingerprint", "face", "biometric"}:
        raise HTTPException(
            status_code=400,
            detail="Raw biometric uploads are not accepted; use WebAuthn or a certified biometric provider",
        )
    if document_type.lower() not in {"aadhar", "aadhaar", "pan", "degree", "bank_account"}:
        raise HTTPException(status_code=400, detail="Unsupported document type")

    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Document exceeds the 10 MB limit")

    encrypted = encrypt_data(contents, document_aad(did, document_type))
    document_id = save_document(
        did,
        document_type.lower(),
        file.filename or "document",
        file.content_type or "application/octet-stream",
        encrypted["nonce"],
        encrypted["ciphertext"],
    )
    write_audit_log(address, did, f"upload_{document_type.lower()}")
    return {"document_id": document_id, "did": did, "document_type": document_type.lower()}


@secure_identity_router.get("/identity/{did}/documents/{document_id}")
def download_document(
    did: str, document_id: int, address: str = Depends(authenticated_address)
):
    identity = get_identity(did)
    document = get_document(document_id, did)
    if not identity or identity["wallet_address"] != address or not document:
        raise HTTPException(status_code=403, detail="You are not authorized for this document")

    write_audit_log(address, did, f"download_{document['document_type']}")
    return Response(
        content=decrypt_data(
            document["nonce"],
            document["ciphertext"],
            document_aad(did, document["document_type"]),
        ),
        media_type=document["media_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{document["filename"]}"'
        },
    )