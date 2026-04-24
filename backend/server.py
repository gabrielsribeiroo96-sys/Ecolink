from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase._async.client import AsyncClient, create_client as async_create_client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']

supabase: AsyncClient = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "dev-secret-key-change-in-production")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(email: str) -> str:
    payload = {"sub": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(email: str) -> str:
    payload = {"sub": email, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
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
        result = await supabase.table("users").select("*").eq("email", payload["sub"]).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="User not found")
        user = result.data[0]
        user.pop("password_hash", None)
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
    cnpj_cpf: Optional[str] = None
    contact: Optional[str] = None
    cep: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class PublishOilInput(BaseModel):
    volume_liters: float


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
    existing = await supabase.table("users").select("id").eq("email", email_lower).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(input.password)
    user_doc = {
        "email": email_lower,
        "password_hash": hashed,
        "name": input.name,
        "role": input.role,
        "cnpj_cpf": input.cnpj_cpf,
        "contact": input.contact,
        "cep": input.cep,
        "street": input.street,
        "number": input.number,
        "complement": input.complement,
        "neighborhood": input.neighborhood,
        "city": input.city,
        "state": input.state,
        "latitude": input.latitude,
        "longitude": input.longitude,
    }

    if not input.latitude and input.street and input.city:
        lat, lng = await geocode_address(input.street, input.number or "", input.city, input.state or "")
        if lat and lng:
            user_doc["latitude"] = lat
            user_doc["longitude"] = lng

    result = await supabase.table("users").insert(user_doc).execute()
    inserted_user = result.data[0]
    inserted_user.pop("password_hash", None)

    access_token = create_access_token(email_lower)
    refresh_token = create_refresh_token(email_lower)

    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

    return inserted_user


@api_router.post("/auth/login")
async def login(input: LoginInput, response: Response):
    email_lower = input.email.lower()
    result = await supabase.table("users").select("*").eq("email", email_lower).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data[0]
    if not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(email_lower)
    refresh_token = create_refresh_token(email_lower)

    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

    user.pop("password_hash", None)
    return user


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}


class UpdateProfileInput(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    cnpj_cpf: Optional[str] = None
    cep: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


async def geocode_address(street: str, number: str, city: str, state: str) -> tuple:
    try:
        import urllib.parse
        import requests

        address_parts = []
        if street:
            address_parts.append(street)
        if number:
            address_parts.append(number)
        if city:
            address_parts.append(city)
        if state:
            address_parts.append(state)

        full_address = ", ".join(address_parts) + ", Brasil"
        encoded_address = urllib.parse.quote(full_address)

        url = f"https://nominatim.openstreetmap.org/search?q={encoded_address}&format=json&limit=1"
        headers = {"User-Agent": "Ecolink/1.0"}

        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()

        if data and len(data) > 0:
            return float(data[0]["lat"]), float(data[0]["lon"])

        return None, None
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return None, None


@api_router.put("/profile/update")
async def update_profile(input: UpdateProfileInput, user: dict = Depends(get_current_user)):
    update_data = {}
    if input.name:
        update_data["name"] = input.name
    if input.contact:
        update_data["contact"] = input.contact
    if input.cnpj_cpf:
        update_data["cnpj_cpf"] = input.cnpj_cpf
    if input.cep is not None:
        update_data["cep"] = input.cep
    if input.street is not None:
        update_data["street"] = input.street
    if input.number is not None:
        update_data["number"] = input.number
    if input.complement is not None:
        update_data["complement"] = input.complement
    if input.neighborhood is not None:
        update_data["neighborhood"] = input.neighborhood
    if input.city is not None:
        update_data["city"] = input.city
    if input.state is not None:
        update_data["state"] = input.state

    if user["role"] == "restaurant" and (input.street or input.city):
        street = input.street or user.get("street", "")
        number = input.number or user.get("number", "")
        city = input.city or user.get("city", "")
        state = input.state or user.get("state", "")

        lat, lng = await geocode_address(street, number, city, state)

        if lat and lng:
            update_data["latitude"] = lat
            update_data["longitude"] = lng

    if update_data:
        await supabase.table("users").update(update_data).eq("email", user["email"]).execute()

    return {"message": "Profile updated successfully"}


@api_router.post("/restaurants/publish-oil")
async def publish_oil(input: PublishOilInput, user: dict = Depends(get_current_user)):
    if user["role"] != "restaurant":
        raise HTTPException(status_code=403, detail="Only restaurants can publish oil")

    if input.volume_liters < 10:
        raise HTTPException(status_code=422, detail="Minimum volume is 10 liters")

    latitude = user.get("latitude")
    longitude = user.get("longitude")

    if not latitude or not longitude:
        raise HTTPException(
            status_code=400,
            detail="Você precisa cadastrar seu endereço completo nas configurações antes de publicar óleo"
        )

    address_parts = []
    if user.get("street"):
        address_parts.append(user.get("street"))
    if user.get("number"):
        address_parts.append(user.get("number"))
    if user.get("neighborhood"):
        address_parts.append(user.get("neighborhood"))
    if user.get("city"):
        address_parts.append(user.get("city"))
    if user.get("state"):
        address_parts.append(user.get("state"))

    full_address = ", ".join(address_parts) if address_parts else "Endereço não informado"

    publication_doc = {
        "publication_id": str(uuid.uuid4()),
        "restaurant_id": user["email"],
        "restaurant_name": user["name"],
        "restaurant_address": full_address,
        "volume_liters": input.volume_liters,
        "status": "available",
        "latitude": latitude,
        "longitude": longitude,
    }

    await supabase.table("oil_publications").insert(publication_doc).execute()

    await supabase.table("volume_history").insert({
        "restaurant_id": user["email"],
        "volume_liters": input.volume_liters,
        "type": "published",
    }).execute()

    await ws_manager.broadcast({
        "type": "new_publication",
        "data": {
            "publication_id": publication_doc["publication_id"],
            "restaurant_name": publication_doc["restaurant_name"],
            "volume_liters": publication_doc["volume_liters"],
            "latitude": latitude,
            "longitude": longitude
        }
    })

    return {"message": "Oil published successfully", "publication_id": publication_doc["publication_id"]}


@api_router.get("/restaurants/impact-stats")
async def get_impact_stats(user: dict = Depends(get_current_user)):
    if user["role"] != "restaurant":
        raise HTTPException(status_code=403, detail="Only restaurants can view impact stats")

    result = await supabase.table("collections").select("collected_volume").eq("restaurant_id", user["email"]).eq("status", "completed").execute()
    collections = result.data

    total_collected = sum(col.get("collected_volume", 0) for col in collections)
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

    result = await supabase.table("volume_history").select("*").eq("restaurant_id", user["email"]).order("recorded_at", desc=True).limit(100).execute()
    return result.data


@api_router.get("/collectors/available-points")
async def get_available_points(user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can view available points")

    result = await supabase.table("oil_publications").select("*").eq("status", "available").execute()
    publications = result.data
    for pub in publications:
        pub.pop("id", None)
        if pub.get("latitude") and pub.get("longitude"):
            pub["location"] = {"type": "Point", "coordinates": [pub["longitude"], pub["latitude"]]}
    return publications


@api_router.post("/collectors/schedule-collection")
async def schedule_collection(input: ScheduleCollectionInput, user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can schedule collections")

    collections_created = []

    for pub_id in input.publication_ids:
        pub_result = await supabase.table("oil_publications").select("*").eq("publication_id", pub_id).eq("status", "available").limit(1).execute()
        if not pub_result.data:
            continue

        publication = pub_result.data[0]

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
        }

        await supabase.table("collections").insert(collection_doc).execute()
        await supabase.table("oil_publications").update({"status": "scheduled"}).eq("publication_id", pub_id).execute()

        collections_created.append(collection_doc["collection_id"])

    return {"message": f"{len(collections_created)} collections scheduled", "collection_ids": collections_created}


@api_router.post("/collectors/confirm-collection")
async def confirm_collection(input: ConfirmCollectionInput, user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can confirm collections")

    col_result = await supabase.table("collections").select("*").eq("collection_id", input.collection_id).limit(1).execute()
    if not col_result.data:
        raise HTTPException(status_code=404, detail="Collection not found")

    collection = col_result.data[0]

    await supabase.table("collections").update({
        "collected_volume": input.collected_volume,
        "status": "completed",
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }).eq("collection_id", input.collection_id).execute()

    await supabase.table("oil_publications").update({"status": "collected"}).eq("publication_id", collection["publication_id"]).execute()

    await supabase.table("volume_history").insert({
        "restaurant_id": collection["restaurant_id"],
        "volume_liters": input.collected_volume,
        "type": "collected",
    }).execute()

    return {"message": "Collection confirmed successfully"}


@api_router.get("/collectors/my-collections")
async def get_my_collections(user: dict = Depends(get_current_user)):
    if user["role"] != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can view their collections")

    result = await supabase.table("collections").select("*").eq("collector_id", user["email"]).order("created_at", desc=True).execute()
    collections = result.data
    for col in collections:
        col.pop("id", None)
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
    allow_origin_regex=r'.*',
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    global supabase
    supabase = await async_create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Connected to Supabase")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ecolink.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    existing = await supabase.table("users").select("id").eq("email", admin_email).limit(1).execute()
    if not existing.data:
        hashed = hash_password(admin_password)
        await supabase.table("users").insert({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "collector",
        }).execute()
        logger.info(f"Admin user created: {admin_email}")
