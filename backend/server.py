from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import json
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "dev-secret-key-change-in-production")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["restaurant", "collector"]
    address: Optional[str] = None
    cnpj_cpf: Optional[str] = None
    contact: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class PublishOilInput(BaseModel):
    volume_liters: float
    latitude: float
    longitude: float

class ScheduleCollectionInput(BaseModel):
    publication_ids: List[str]
    scheduled_date: str

class ConfirmCollectionInput(BaseModel):
    collection_id: str
    collected_volume: float

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

ws_manager = WebSocketManager()

@api_router.post("/auth/register")
async def register(input: RegisterInput, response: Response):
    email_lower = input.email.lower()
    existing = await db.users.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(input.password)
    user_doc = {
        "email": email_lower,
        "password_hash": hashed,
        "name": input.name,
        "role": input.role,
        "address": input.address,
        "cnpj_cpf": input.cnpj_cpf,
        "contact": input.contact,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if input.latitude and input.longitude:
        user_doc["location"] = {
            "type": "Point",
            "coordinates": [input.longitude, input.latitude]
        }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email_lower)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    
    # Remove ObjectId and password_hash before returning
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    user_doc["user_id"] = user_id
    return user_doc

@api_router.post("/auth/login")
async def login(input: LoginInput, response: Response):
    email_lower = input.email.lower()
    user = await db.users.find_one({"email": email_lower})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email_lower)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    
    user.pop("password_hash")
    user.pop("_id")
    user["user_id"] = user_id
    return user

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/restaurants/publish-oil")
async def publish_oil(input: PublishOilInput, user: dict = Depends(get_current_user)):
    if user["role"] != "restaurant":
        raise HTTPException(status_code=403, detail="Only restaurants can publish oil")
    
    if input.volume_liters < 10:
        raise HTTPException(status_code=422, detail="Minimum volume is 10 liters")
    
    publication_doc = {
        "publication_id": str(uuid.uuid4()),
        "restaurant_id": user["email"],
        "restaurant_name": user["name"],
        "restaurant_address": user.get("address", ""),
        "volume_liters": input.volume_liters,
        "status": "available",
        "location": {
            "type": "Point",
            "coordinates": [input.longitude, input.latitude]
        },
        "published_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.oil_publications.insert_one(publication_doc)
    
    await db.volume_history.insert_one({
        "restaurant_id": user["email"],
        "volume_liters": input.volume_liters,
        "type": "published",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    await ws_manager.broadcast({
        "type": "new_publication",
        "data": {
            "publication_id": publication_doc["publication_id"],
            "restaurant_name": publication_doc["restaurant_name"],
            "volume_liters": publication_doc["volume_liters"],
            "latitude": input.latitude,
            "longitude": input.longitude
        }
    })
    
    return {"message": "Oil published successfully", "publication_id": publication_doc["publication_id"]}

@api_router.get("/restaurants/impact-stats")
async def get_impact_stats(user: dict = Depends(get_current_user)):
    if user["role"] != "restaurant":
        raise HTTPException(status_code=403, detail="Only restaurants can view impact stats")
    
    total_collected = 0
    collections = await db.collections.find({"restaurant_id": user["email"], "status": "completed"}, {"_id": 0}).to_list(1000)
    for col in collections:
        total_collected += col.get("collected_volume", 0)
    
    water_preserved = total_collected * 1000
    
    return {
        "total_oil_collected_liters": total_collected,
        "water_preserved_liters": water_preserved,
        "collections_count": len(collections)
    }

@api_router.get("/restaurants/volume-history")
async def get_volume_history(user: dict = Depends(get_current_user)):
    if user["role"] != "restaurant":
        raise HTTPException(status_code=403, detail="Only restaurants can view volume history")
    
    history = await db.volume_history.find({"restaurant_id": user["email"]}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return history

@api_router.get("/collectors/available-points")
async def get_available_points(user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can view available points")
    
    publications = await db.oil_publications.find({"status": "available"}, {"_id": 0}).to_list(1000)
    return publications

@api_router.post("/collectors/schedule-collection")
async def schedule_collection(input: ScheduleCollectionInput, user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can schedule collections")
    
    collections_created = []
    
    for pub_id in input.publication_ids:
        publication = await db.oil_publications.find_one({"publication_id": pub_id, "status": "available"})
        if not publication:
            continue
        
        collection_doc = {
            "collection_id": str(uuid.uuid4()),
            "collector_id": user["email"],
            "collector_name": user["name"],
            "restaurant_id": publication["restaurant_id"],
            "restaurant_name": publication["restaurant_name"],
            "publication_id": pub_id,
            "scheduled_volume": publication["volume_liters"],
            "scheduled_date": input.scheduled_date,
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.collections.insert_one(collection_doc)
        await db.oil_publications.update_one({"publication_id": pub_id}, {"$set": {"status": "scheduled"}})
        
        collections_created.append(collection_doc["collection_id"])
    
    return {"message": f"{len(collections_created)} collections scheduled", "collection_ids": collections_created}

@api_router.post("/collectors/confirm-collection")
async def confirm_collection(input: ConfirmCollectionInput, user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can confirm collections")
    
    collection = await db.collections.find_one({"collection_id": input.collection_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    await db.collections.update_one(
        {"collection_id": input.collection_id},
        {"$set": {
            "collected_volume": input.collected_volume,
            "status": "completed",
            "collected_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.oil_publications.update_one(
        {"publication_id": collection["publication_id"]},
        {"$set": {"status": "collected"}}
    )
    
    await db.volume_history.insert_one({
        "restaurant_id": collection["restaurant_id"],
        "volume_liters": input.collected_volume,
        "type": "collected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Collection confirmed successfully"}

@api_router.get("/collectors/my-collections")
async def get_my_collections(user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can view their collections")
    
    collections = await db.collections.find({"collector_id": user["email"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return collections

@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.oil_publications.create_index([("location", "2dsphere")])
    await db.oil_publications.create_index("publication_id", unique=True)
    await db.collections.create_index("collection_id", unique=True)
    
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ecolink.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "collector",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: collector

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout
""")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
