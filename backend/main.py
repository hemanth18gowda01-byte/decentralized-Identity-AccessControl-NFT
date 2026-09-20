from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.identity import identity_router
from backend.routes.access import access_router
from backend.routes.assets import assets_router
from backend.routes.secure_identity import secure_identity_router
from backend.services.auth import router as auth_router
from database.database import init_database

app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://127.0.0.1:5175",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(identity_router)
app.include_router(access_router)
app.include_router(assets_router)
app.include_router(auth_router)
app.include_router(secure_identity_router)

init_database()

@app.get("/")
def home():
    return {"message":"Backend is Running"}
