"""
Livanespor Football Club - Backend API
FastAPI + MongoDB + JWT Auth + OpenAI gpt-image-2
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import uuid
import logging
import bcrypt
import jwt as pyjwt
import base64
import asyncio
from slugify import slugify
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ─────────────────────────── Config ───────────────────────────
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_HOURS = int(os.environ.get('JWT_EXPIRE_HOURS', '168'))
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
DEFAULT_ADMIN_EMAIL = os.environ.get('DEFAULT_ADMIN_EMAIL', 'admin@livanespor.com')
DEFAULT_ADMIN_PASSWORD = os.environ.get('DEFAULT_ADMIN_PASSWORD', 'Livanespor2026!')
DEFAULT_ADMIN_NAME = os.environ.get('DEFAULT_ADMIN_NAME', 'Süper Admin')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Livanespor API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ─────────────────────────── Helpers ───────────────────────────
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Geçersiz token: {e}")

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli")
    payload = decode_token(creds.credentials)
    user = await db.users.find_one({'id': payload['sub']}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    return user

async def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get('role') not in ('super_admin', 'admin', 'editor', 'academy_lead', 'media_lead', 'sponsor_lead'):
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    return user

def make_slug(text: str, prefix: str = "") -> str:
    base = slugify(text or "icerik", lowercase=True)
    return f"{prefix}{base}-{uuid.uuid4().hex[:6]}"

def clean_doc(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    doc.pop('_id', None)
    return doc

# ─────────────────────────── Pydantic Models ───────────────────────────
class LoginIn(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "editor"

class TokenOut(BaseModel):
    token: str
    user: UserOut

# Generic write payload — accepts any fields
class GenericIn(BaseModel):
    model_config = ConfigDict(extra="allow")

# ─────────────────────────── Auth Routes ───────────────────────────
@api_router.post("/auth/login", response_model=TokenOut)
async def login(payload: LoginIn):
    username = payload.email.strip().lower()
    logger.info(f"[LOGIN] attempt username='{username}' from request")
    user = await db.users.find_one({'email': username})
    if not user:
        # Try also without lower (in case stored differently)
        user = await db.users.find_one({'email': payload.email.strip()})
    if not user:
        logger.warning(f"[LOGIN] FAIL: user '{username}' not found in DB")
        raise HTTPException(status_code=401, detail=f"Kullanıcı bulunamadı: '{username}'. (DB'de bu kullanıcı adı kayıtlı değil)")
    if not verify_password(payload.password, user.get('password_hash', '')):
        logger.warning(f"[LOGIN] FAIL: password mismatch for '{username}'")
        raise HTTPException(status_code=401, detail="Şifre hatalı (kullanıcı adı doğru, şifre yanlış)")
    logger.info(f"[LOGIN] OK: '{username}' role={user['role']}")
    token = create_token(user['id'], user['email'], user['role'])
    return TokenOut(
        token=token,
        user=UserOut(
            id=user['id'], email=user['email'], name=user['name'],
            role=user['role'], created_at=user['created_at'],
        ),
    )

@api_router.get("/auth/diagnose")
async def auth_diagnose():
    """Public diagnostic endpoint to debug login issues.
    Returns sanitized info about admin users — NO passwords."""
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(50)
    return {
        'env_default_username': DEFAULT_ADMIN_EMAIL.lower(),
        'env_default_name': DEFAULT_ADMIN_NAME,
        'total_users': len(users),
        'users': [
            {
                'username': u.get('email'),
                'name': u.get('name'),
                'role': u.get('role'),
                'created_at': u.get('created_at'),
            } for u in users
        ],
        'note': 'If env_default_username does not match any user.username, the seed function did not run or did not sync. Restart backend to trigger seed_admin().',
    }

@api_router.post("/auth/force-reseed")
async def force_reseed():
    """Force re-sync of admin user from .env values. Public endpoint for emergency recovery."""
    await seed_admin()
    users = await db.users.find({'role': 'super_admin'}, {'_id': 0, 'password_hash': 0}).to_list(10)
    return {'ok': True, 'super_admins': users, 'message': 'Admin re-seeded from .env'}

class ResetCredentialsIn(BaseModel):
    new_username: str
    new_password: str
    confirm: str  # Must equal "LIVANESPOR-RESET-2026" to proceed

@api_router.post("/auth/reset-credentials")
async def reset_credentials(payload: ResetCredentialsIn):
    """Emergency endpoint to reset super_admin credentials.
    Requires a hardcoded confirm string to prevent abuse."""
    if payload.confirm != "LIVANESPOR-RESET-2026":
        raise HTTPException(403, "Geçersiz onay anahtarı")
    new_username = payload.new_username.strip().lower()
    if not new_username or len(payload.new_password) < 6:
        raise HTTPException(400, "Kullanıcı adı boş olamaz, şifre en az 6 karakter")
    pw_hash = hash_password(payload.new_password)
    # Wipe all super_admins and create one fresh
    await db.users.delete_many({'role': 'super_admin'})
    await db.users.insert_one({
        'id': new_id(),
        'email': new_username,
        'name': DEFAULT_ADMIN_NAME or 'Admin',
        'role': 'super_admin',
        'password_hash': pw_hash,
        'created_at': now_iso(),
    })
    logger.info(f"[RESET] super_admin reset to username='{new_username}'")
    return {'ok': True, 'username': new_username, 'message': 'Şifre güncellendi. Yeni bilgilerle giriş yapabilirsiniz.'}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(**{k: user[k] for k in ('id', 'email', 'name', 'role', 'created_at')})

@api_router.post("/auth/users", response_model=UserOut)
async def create_user(payload: UserCreate, user=Depends(require_admin)):
    if user.get('role') != 'super_admin':
        raise HTTPException(403, "Sadece süper admin kullanıcı oluşturabilir")
    if await db.users.find_one({'email': payload.email.lower()}):
        raise HTTPException(400, "Bu e-posta kayıtlı")
    doc = {
        'id': new_id(), 'email': payload.email.lower(), 'name': payload.name,
        'role': payload.role, 'password_hash': hash_password(payload.password),
        'created_at': now_iso(),
    }
    await db.users.insert_one(doc)
    return UserOut(id=doc['id'], email=doc['email'], name=doc['name'], role=doc['role'], created_at=doc['created_at'])

@api_router.get("/auth/users", response_model=List[UserOut])
async def list_users(user=Depends(require_admin)):
    rows = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(500)
    return [UserOut(**r) for r in rows]

class ChangeCredentialsIn(BaseModel):
    current_password: str
    new_username: Optional[str] = None
    new_password: Optional[str] = None
    new_name: Optional[str] = None

@api_router.post("/auth/change-credentials")
async def change_credentials(payload: ChangeCredentialsIn, user=Depends(get_current_user)):
    """Change own username/password/name. Requires current password."""
    full = await db.users.find_one({'id': user['id']})
    if not full or not verify_password(payload.current_password, full.get('password_hash', '')):
        raise HTTPException(401, "Mevcut şifre hatalı")
    updates = {}
    if payload.new_username:
        new_uname = payload.new_username.strip().lower()
        if not new_uname:
            raise HTTPException(400, "Kullanıcı adı boş olamaz")
        # Check uniqueness
        clash = await db.users.find_one({'email': new_uname, 'id': {'$ne': user['id']}})
        if clash:
            raise HTTPException(400, "Bu kullanıcı adı zaten kullanılıyor")
        updates['email'] = new_uname
    if payload.new_password:
        if len(payload.new_password) < 6:
            raise HTTPException(400, "Şifre en az 6 karakter olmalı")
        updates['password_hash'] = hash_password(payload.new_password)
    if payload.new_name:
        updates['name'] = payload.new_name.strip()
    if not updates:
        raise HTTPException(400, "Değiştirilecek alan belirtilmedi")
    await db.users.update_one({'id': user['id']}, {'$set': updates})
    logger.info(f"[CHANGE-CRED] user {user['id']} updated: {list(updates.keys())}")
    return {'ok': True, 'updated': list(updates.keys()), 'message': 'Bilgileriniz güncellendi. Lütfen tekrar giriş yapın.'}

# ─────────────────────────── Generic CRUD factory ───────────────────────────
COLLECTIONS = {
    'players': {'public': True, 'slug_field': 'name'},
    'staff': {'public': True, 'slug_field': 'name'},
    'matches': {'public': True, 'slug_field': None},
    'standings': {'public': True, 'slug_field': None},
    'sponsors': {'public': True, 'slug_field': 'name'},
    'academy_groups': {'public': True, 'slug_field': 'name'},
    'training_sessions': {'public': True, 'slug_field': None},
    'academy_applications': {'public': False, 'slug_field': None},
    'posts': {'public': True, 'slug_field': 'title'},
    'categories': {'public': True, 'slug_field': 'name'},
    'contact_messages': {'public': False, 'slug_field': None},
    'media': {'public': False, 'slug_field': None},
    'hero_slides': {'public': True, 'slug_field': None},
}

async def _list(coll: str, public_only: bool = False, filters: Optional[dict] = None, sort_field: str = 'created_at', sort_dir: int = -1, limit: int = 500):
    q = filters.copy() if filters else {}
    if public_only and coll in ('posts',):
        q['status'] = 'published'
    if public_only and coll in ('players', 'staff', 'sponsors', 'academy_groups', 'hero_slides'):
        q['active'] = {'$ne': False}
    rows = await db[coll].find(q, {'_id': 0}).sort(sort_field, sort_dir).to_list(limit)
    return rows

async def _create(coll: str, data: dict) -> dict:
    doc = dict(data)
    doc['id'] = new_id()
    doc['created_at'] = now_iso()
    doc['updated_at'] = now_iso()
    cfg = COLLECTIONS.get(coll, {})
    if cfg.get('slug_field') and not doc.get('slug'):
        src = doc.get(cfg['slug_field']) or doc.get('title') or doc.get('name') or 'item'
        doc['slug'] = make_slug(src)
    await db[coll].insert_one(doc)
    return clean_doc(doc)

async def _update(coll: str, item_id: str, data: dict) -> dict:
    data = {k: v for k, v in data.items() if k not in ('id', 'created_at', '_id')}
    data['updated_at'] = now_iso()
    res = await db[coll].find_one_and_update(
        {'id': item_id}, {'$set': data}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Bulunamadı")
    return clean_doc(res)

async def _delete(coll: str, item_id: str):
    res = await db[coll].delete_one({'id': item_id})
    if not res.deleted_count:
        raise HTTPException(404, "Bulunamadı")
    return {'ok': True}

async def _get_one(coll: str, item_id_or_slug: str) -> dict:
    doc = await db[coll].find_one({'$or': [{'id': item_id_or_slug}, {'slug': item_id_or_slug}]}, {'_id': 0})
    if not doc:
        raise HTTPException(404, "Bulunamadı")
    return doc

# ─────────────────────────── Public Endpoints ───────────────────────────
@api_router.get("/public/site-settings")
async def public_site_settings():
    s = await db.site_settings.find_one({'id': 'main'}, {'_id': 0})
    return s or {}

@api_router.get("/public/hero-slides")
async def public_hero_slides():
    return await _list('hero_slides', public_only=True, sort_field='order', sort_dir=1)

@api_router.get("/public/players")
async def public_players(position: Optional[str] = None):
    filters = {}
    if position:
        filters['position'] = position
    rows = await _list('players', public_only=True, filters=filters, sort_field='jersey_number', sort_dir=1)
    return rows

@api_router.get("/public/players/{slug}")
async def public_player(slug: str):
    return await _get_one('players', slug)

@api_router.get("/public/staff")
async def public_staff(category: Optional[str] = None):
    filters = {}
    if category:
        filters['category'] = category
    return await _list('staff', public_only=True, filters=filters, sort_field='order', sort_dir=1)

@api_router.get("/public/matches")
async def public_matches(status_filter: Optional[str] = Query(None, alias='status'), limit: int = 50):
    filters = {}
    if status_filter:
        filters['status'] = status_filter
    return await _list('matches', filters=filters, sort_field='match_date', sort_dir=1, limit=limit)

@api_router.get("/public/matches/next")
async def public_next_match():
    doc = await db.matches.find_one({'status': 'upcoming'}, {'_id': 0}, sort=[('match_date', 1)])
    return doc or {}

@api_router.get("/public/matches/last")
async def public_last_match():
    doc = await db.matches.find_one({'status': 'finished'}, {'_id': 0}, sort=[('match_date', -1)])
    return doc or {}

@api_router.get("/public/standings")
async def public_standings(league_group: Optional[str] = None):
    filters = {}
    if league_group:
        filters['league_group'] = league_group
    return await _list('standings', filters=filters, sort_field='rank', sort_dir=1)

@api_router.get("/public/sponsors")
async def public_sponsors(scope: Optional[str] = None, level: Optional[str] = None):
    filters = {}
    if scope:
        filters['scope'] = {'$in': [scope, 'both']}
    if level:
        filters['level'] = level
    return await _list('sponsors', public_only=True, filters=filters, sort_field='order', sort_dir=1)

@api_router.get("/public/academy/groups")
async def public_academy_groups():
    return await _list('academy_groups', public_only=True, sort_field='order', sort_dir=1)

@api_router.get("/public/academy/sessions")
async def public_academy_sessions():
    return await _list('training_sessions', sort_field='day_of_week', sort_dir=1)

@api_router.get("/public/posts")
async def public_posts(category: Optional[str] = None, limit: int = 20):
    filters = {}
    if category:
        filters['category'] = category
    return await _list('posts', public_only=True, filters=filters, sort_field='published_at', sort_dir=-1, limit=limit)

@api_router.get("/public/posts/{slug}")
async def public_post_detail(slug: str):
    doc = await db.posts.find_one({'slug': slug, 'status': 'published'}, {'_id': 0})
    if not doc:
        raise HTTPException(404, "Haber bulunamadı")
    return doc

@api_router.get("/public/categories")
async def public_categories():
    return await _list('categories', sort_field='name', sort_dir=1)

# Public form submissions
@api_router.post("/public/contact")
async def public_contact_submit(payload: GenericIn):
    return await _create('contact_messages', {**payload.model_dump(), 'status': 'unread'})

@api_router.post("/public/academy/apply")
async def public_academy_apply(payload: GenericIn):
    data = payload.model_dump()
    data['status'] = 'new'
    data['application_no'] = f"LIV-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:5].upper()}"
    return await _create('academy_applications', data)

# ─────────────────────────── Admin Generic CRUD ───────────────────────────
def admin_routes(coll_name: str):
    """Register /api/admin/<coll> CRUD routes for a collection."""
    @api_router.get(f"/admin/{coll_name}")
    async def _admin_list(user=Depends(require_admin)):
        return await _list(coll_name, public_only=False)

    @api_router.get(f"/admin/{coll_name}/{{item_id}}")
    async def _admin_get(item_id: str, user=Depends(require_admin)):
        return await _get_one(coll_name, item_id)

    @api_router.post(f"/admin/{coll_name}")
    async def _admin_create(payload: GenericIn, user=Depends(require_admin)):
        return await _create(coll_name, payload.model_dump())

    @api_router.put(f"/admin/{coll_name}/{{item_id}}")
    async def _admin_update(item_id: str, payload: GenericIn, user=Depends(require_admin)):
        return await _update(coll_name, item_id, payload.model_dump())

    @api_router.delete(f"/admin/{coll_name}/{{item_id}}")
    async def _admin_delete(item_id: str, user=Depends(require_admin)):
        return await _delete(coll_name, item_id)

for c in COLLECTIONS.keys():
    admin_routes(c)

# ─────────────────────────── Site Settings ───────────────────────────
@api_router.get("/admin/site-settings")
async def admin_get_settings(user=Depends(require_admin)):
    s = await db.site_settings.find_one({'id': 'main'}, {'_id': 0})
    return s or {}

@api_router.put("/admin/site-settings")
async def admin_update_settings(payload: GenericIn, user=Depends(require_admin)):
    data = payload.model_dump()
    data['id'] = 'main'
    data['updated_at'] = now_iso()
    await db.site_settings.update_one({'id': 'main'}, {'$set': data}, upsert=True)
    s = await db.site_settings.find_one({'id': 'main'}, {'_id': 0})
    return s

# ─────────────────────────── AI Settings & Generation ───────────────────────────
@api_router.get("/admin/ai-settings")
async def admin_get_ai_settings(user=Depends(require_admin)):
    s = await db.ai_settings.find_one({'id': 'main'}, {'_id': 0})
    if s:
        # Mask API key
        if s.get('openai_api_key'):
            k = s['openai_api_key']
            s['openai_api_key_masked'] = f"{k[:8]}...{k[-4:]}" if len(k) > 12 else "***"
            s.pop('openai_api_key', None)
    else:
        s = {'enabled': bool(OPENAI_API_KEY), 'openai_api_key_masked': f"{OPENAI_API_KEY[:8]}...{OPENAI_API_KEY[-4:]}" if OPENAI_API_KEY else ""}
    return s

class AiSettingsIn(BaseModel):
    openai_api_key: Optional[str] = None
    enabled: bool = True
    default_quality: str = "high"
    default_size: str = "1024x1024"

@api_router.put("/admin/ai-settings")
async def admin_update_ai_settings(payload: AiSettingsIn, user=Depends(require_admin)):
    data = payload.model_dump(exclude_none=True)
    data['id'] = 'main'
    data['updated_at'] = now_iso()
    await db.ai_settings.update_one({'id': 'main'}, {'$set': data}, upsert=True)
    return {'ok': True}

# ─────────────────────────── Mackolik Sync ───────────────────────────
import mackolik_sync
import mackolik_scheduler
import storage as object_storage
import ai_media

class MackolikSettingsIn(BaseModel):
    macko_team_id: str
    team_display_name: str
    enabled: bool = True
    auto_sync_enabled: bool = False
    auto_sync_day: str = "sun"  # mon..sun
    auto_sync_hour: int = 0     # 0..23
    auto_sync_minute: int = 0   # 0..59
    auto_sync_timezone: str = "Europe/Istanbul"
    auto_sync_options: Optional[Dict[str, bool]] = None

class MackolikSyncIn(BaseModel):
    standings: bool = True
    fixtures: bool = True
    squad: bool = True
    photos: bool = True
    force_photos: bool = False

def _macko_settings_doc(d: Optional[dict]) -> dict:
    base = {
        'macko_team_id': '', 'team_display_name': '', 'enabled': True,
        'auto_sync_enabled': False, 'auto_sync_day': 'sun',
        'auto_sync_hour': 0, 'auto_sync_minute': 0,
        'auto_sync_timezone': 'Europe/Istanbul',
        'auto_sync_options': {'standings': True, 'fixtures': True, 'squad': True,
                              'photos': True, 'force_photos': False},
        'last_sync_at': None, 'last_sync_status': None,
        'last_sync_summary': None, 'last_sync_error': None,
        'last_sync_trigger': None,
    }
    if d:
        base.update({k: v for k, v in d.items() if k != '_id'})
    base.pop('id', None)
    base['next_auto_sync_at'] = mackolik_scheduler.get_next_run_iso()
    return base

@api_router.get("/admin/mackolik/settings")
async def admin_get_macko_settings(user=Depends(require_admin)):
    s = await db.site_settings.find_one({'id': 'mackolik'}, {'_id': 0})
    return _macko_settings_doc(s)

@api_router.put("/admin/mackolik/settings")
async def admin_put_macko_settings(payload: MackolikSettingsIn, user=Depends(require_admin)):
    data = payload.model_dump()
    data['id'] = 'mackolik'
    data['updated_at'] = now_iso()
    await db.site_settings.update_one({'id': 'mackolik'}, {'$set': data}, upsert=True)
    # Reschedule auto-sync based on new settings
    try:
        await mackolik_scheduler.reschedule_from_db()
    except Exception as e:
        logger.warning(f"Mackolik reschedule failed: {e}")
    s = await db.site_settings.find_one({'id': 'mackolik'}, {'_id': 0})
    return _macko_settings_doc(s)

@api_router.post("/admin/mackolik/test")
async def admin_macko_test(user=Depends(require_admin)):
    s = await db.site_settings.find_one({'id': 'mackolik'}, {'_id': 0})
    if not s or not s.get('macko_team_id') or not s.get('team_display_name'):
        raise HTTPException(400, "Önce Mackolik takım ID ve takım adı girin.")
    try:
        payload = await mackolik_sync.fetch_all(s['macko_team_id'], s['team_display_name'])
        return {
            'ok': True,
            'urls': payload['urls'],
            'counts': {
                'standings': len(payload['standings']),
                'fixtures': len(payload['fixtures']),
                'squad': len(payload['squad']),
            },
            'sample': {
                'standings': payload['standings'][:3],
                'fixtures': payload['fixtures'][:2],
                'squad': payload['squad'][:2],
            },
        }
    except Exception as e:
        logger.exception("Mackolik test failed")
        raise HTTPException(502, f"Mackolik bağlantısı başarısız: {e}")

@api_router.post("/admin/mackolik/sync")
async def admin_macko_sync(payload: MackolikSyncIn, user=Depends(require_admin)):
    s = await db.site_settings.find_one({'id': 'mackolik'}, {'_id': 0})
    if not s or not s.get('macko_team_id') or not s.get('team_display_name'):
        raise HTTPException(400, "Önce Mackolik takım ID ve takım adı girin.")
    if not s.get('enabled', True):
        raise HTTPException(400, "Mackolik senkronizasyonu devre dışı.")
    try:
        await db.site_settings.update_one(
            {'id': 'mackolik'},
            {'$set': {'last_sync_status': 'running', 'last_sync_started_at': now_iso()}},
        )
        summary = await mackolik_sync.sync_to_db(
            db, s['macko_team_id'], s['team_display_name'], payload.model_dump()
        )
        await db.site_settings.update_one(
            {'id': 'mackolik'},
            {'$set': {
                'last_sync_status': 'success',
                'last_sync_at': now_iso(),
                'last_sync_summary': summary,
                'last_sync_error': None,
            }},
        )
        return {'ok': True, 'summary': summary}
    except Exception as e:
        logger.exception("Mackolik sync failed")
        await db.site_settings.update_one(
            {'id': 'mackolik'},
            {'$set': {
                'last_sync_status': 'error',
                'last_sync_error': str(e),
                'last_sync_at': now_iso(),
            }},
        )
        raise HTTPException(500, f"Senkronizasyon hatası: {e}")

class AiGenerateIn(BaseModel):
    prompt: str
    aspect_ratio: Literal["1:1", "16:9", "4:5", "9:16"] = "1:1"
    quality: Literal["low", "medium", "high"] = "high"
    save_to_media: bool = True
    title: Optional[str] = None

ASPECT_TO_SIZE = {
    "1:1": "1024x1024",
    "16:9": "1536x1024",
    "4:5": "1024x1280",
    "9:16": "1024x1536",
}

@api_router.post("/admin/ai/generate-image")
async def admin_ai_generate(payload: AiGenerateIn, user=Depends(require_admin)):
    # Resolve API key: db override or env
    s = await db.ai_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
    api_key = s.get('openai_api_key') or OPENAI_API_KEY
    if not api_key:
        raise HTTPException(400, "OpenAI API anahtarı yapılandırılmamış. AI Ayarları'ndan ekleyin.")
    if s.get('enabled') is False:
        raise HTTPException(400, "AI görsel üretimi devre dışı")

    # Credit metering
    if not await consume_credit(1, note=f"AI prompt: {payload.prompt[:40]}"):
        raise HTTPException(402, "Kredi yetersiz. PAKETİM ekranından paketinizi yükseltin.")

    size = ASPECT_TO_SIZE[payload.aspect_ratio]
    try:
        oclient = AsyncOpenAI(api_key=api_key)
        # Try gpt-image-2 first, fallback to gpt-image-1 if not available
        try:
            resp = await oclient.images.generate(
                model="gpt-image-2",
                prompt=payload.prompt,
                size=size,
                quality=payload.quality,
                n=1,
            )
            model_used = "gpt-image-2"
        except Exception as e1:
            logging.warning(f"gpt-image-2 failed, trying gpt-image-1: {e1}")
            resp = await oclient.images.generate(
                model="gpt-image-1",
                prompt=payload.prompt,
                size=size,
                quality=payload.quality,
                n=1,
            )
            model_used = "gpt-image-1"

        b64 = resp.data[0].b64_json
        if not b64:
            raise HTTPException(500, "Görsel üretilemedi")

        # Upload to Object Storage for durable hosting
        png_bytes = base64.b64decode(b64)
        public_url = None
        storage_path = None
        try:
            sp = object_storage.new_path("ai", "png")
            result = await object_storage.put_bytes(sp, png_bytes, "image/png")
            storage_path = result.get("path", sp)
            public_url = f"/api/public/media/{storage_path}"
        except Exception as se:
            logging.warning(f"Object storage upload failed, falling back to base64: {se}")

        data_url = f"data:image/png;base64,{b64}"

        media_doc = None
        if payload.save_to_media:
            media_doc = await _create('media', {
                'title': payload.title or payload.prompt[:60],
                'type': 'image',
                'source': 'ai',
                'model': model_used,
                'prompt': payload.prompt,
                'aspect_ratio': payload.aspect_ratio,
                'quality': payload.quality,
                'storage_path': storage_path,
                'public_url': public_url,
                'data_url': None if public_url else data_url,  # only fallback if storage failed
                'is_deleted': False,
            })
            # Enforce 500-item archive cap (soft-delete oldest)
            await _enforce_media_cap(500)

        return {
            'data_url': data_url if not public_url else None,
            'public_url': public_url,
            'storage_path': storage_path,
            'model': model_used,
            'size': size,
            'media': media_doc,
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("AI image gen error")
        raise HTTPException(500, f"Görsel üretim hatası: {str(e)[:200]}")


# ─────────────────────────── AI Templates (Phase 2) ───────────────────────────
async def _enforce_media_cap(cap: int = 500):
    """Soft-delete oldest media rows beyond `cap`, prioritising already ai-generated ones."""
    total = await db.media.count_documents({'is_deleted': {'$ne': True}})
    if total <= cap:
        return
    excess = total - cap
    # Oldest first
    oldest = await db.media.find({'is_deleted': {'$ne': True}}, {'_id': 0, 'id': 1}).sort('created_at', 1).limit(excess).to_list(excess)
    ids = [r['id'] for r in oldest if r.get('id')]
    if ids:
        await db.media.update_many({'id': {'$in': ids}}, {'$set': {'is_deleted': True, 'deleted_at': now_iso(), 'deleted_reason': 'archive_cap'}})

async def _resolve_template_ctx(template_key: str, payload: dict) -> dict:
    """Expand ctx with DB lookups: player_id → full player doc; match_id → match doc."""
    ctx = dict(payload)
    # Player lookup
    pid = ctx.pop('player_id', None)
    if pid:
        p = await db.players.find_one({'$or': [{'id': pid}, {'slug': pid}]}, {'_id': 0})
        if p:
            ctx['player'] = p
    # Match lookup
    mid = ctx.pop('match_id', None)
    if mid:
        m = await db.matches.find_one({'id': mid}, {'_id': 0})
        if m:
            ctx.setdefault('home_team', m.get('home_team'))
            ctx.setdefault('away_team', m.get('away_team'))
            ctx.setdefault('home_score', m.get('home_score'))
            ctx.setdefault('away_score', m.get('away_score'))
            ctx.setdefault('match_date', (m.get('match_date') or '')[:10])
            ctx.setdefault('venue', m.get('venue'))
            ctx.setdefault('competition', m.get('competition'))
            ctx.setdefault('opponent', m.get('opponent'))
    # Starting XI: list of player_ids → players
    player_ids = ctx.pop('player_ids', None)
    if player_ids:
        rows = await db.players.find({'id': {'$in': player_ids}}, {'_id': 0}).to_list(20)
        # Preserve input order
        ordered = []
        for pid_ in player_ids:
            found = next((r for r in rows if r.get('id') == pid_), None)
            if found:
                ordered.append(found)
        ctx['players'] = ordered
    return ctx

@api_router.get("/admin/ai/templates")
async def admin_ai_templates(user=Depends(require_admin)):
    return ai_media.list_templates()

class AiTemplateIn(BaseModel):
    template_key: str
    context: Dict[str, Any] = {}
    aspect_ratio: Optional[Literal["1:1", "16:9", "4:5", "9:16"]] = None
    quality: Literal["low", "medium", "high"] = "high"
    title: Optional[str] = None

async def _run_ai_job(job_id: str):
    """Background worker: pick up job, call gpt-image-2, store result. Race-safe (APScheduler one-shot)."""
    job = await db.ai_media_jobs.find_one({'id': job_id}, {'_id': 0})
    if not job:
        logger.warning(f"AI job {job_id} vanished before worker pick-up")
        return
    # Idempotency: only run if status==pending
    cur = await db.ai_media_jobs.find_one_and_update(
        {'id': job_id, 'status': 'pending'},
        {'$set': {'status': 'processing', 'started_at': now_iso()}},
        return_document=True,
    )
    if not cur:
        logger.info(f"AI job {job_id} already claimed; skipping")
        return
    try:
        site = await db.site_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
        ctx = await _resolve_template_ctx(cur['template_key'], cur.get('context') or {})
        prompt, default_title = ai_media.build_prompt(cur['template_key'], ctx, site)
        tpl = ai_media.TEMPLATES[cur['template_key']]
        aspect = cur.get('aspect_ratio') or tpl['aspect_ratio']
        size = ASPECT_TO_SIZE[aspect]
        ai_settings = await db.ai_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
        api_key = ai_settings.get('openai_api_key') or OPENAI_API_KEY
        if not api_key:
            raise RuntimeError("OpenAI key not configured")
        oclient = AsyncOpenAI(api_key=api_key)
        model_used = "gpt-image-2"
        try:
            resp = await oclient.images.generate(model="gpt-image-2", prompt=prompt, size=size, quality=cur.get('quality', 'high'), n=1)
        except Exception as e1:
            logger.warning(f"gpt-image-2 failed, fallback: {e1}")
            resp = await oclient.images.generate(model="gpt-image-1", prompt=prompt, size=size, quality=cur.get('quality', 'high'), n=1)
            model_used = "gpt-image-1"
        b64 = resp.data[0].b64_json
        if not b64:
            raise RuntimeError("No image returned")
        png = base64.b64decode(b64)
        public_url = None
        storage_path = None
        try:
            sp = object_storage.new_path("ai", "png")
            r = await object_storage.put_bytes(sp, png, "image/png")
            storage_path = r.get("path", sp)
            public_url = f"/api/public/media/{storage_path}"
        except Exception as se:
            logger.warning(f"Storage upload failed: {se}")
        media = await _create('media', {
            'title': cur.get('title') or default_title,
            'type': 'image',
            'source': 'ai_template',
            'template_key': cur['template_key'],
            'model': model_used,
            'prompt': prompt,
            'aspect_ratio': aspect,
            'quality': cur.get('quality', 'high'),
            'storage_path': storage_path,
            'public_url': public_url,
            'data_url': None if public_url else f"data:image/png;base64,{b64}",
            'is_deleted': False,
        })
        await _enforce_media_cap(500)
        await db.ai_media_jobs.update_one({'id': job_id}, {'$set': {
            'status': 'success',
            'finished_at': now_iso(),
            'media_id': media['id'],
            'public_url': public_url,
            'storage_path': storage_path,
            'model': model_used,
            'prompt': prompt,
        }})
    except Exception as e:
        logger.exception(f"AI job {job_id} failed")
        await db.ai_media_jobs.update_one({'id': job_id}, {'$set': {
            'status': 'error',
            'finished_at': now_iso(),
            'error': str(e)[:500],
        }})

@api_router.post("/admin/ai/generate-template")
async def admin_ai_generate_template(payload: AiTemplateIn, user=Depends(require_admin)):
    if payload.template_key not in ai_media.TEMPLATES:
        raise HTTPException(400, "Geçersiz şablon anahtarı")
    # Credit check + consume up-front (only after template key validated)
    if not await consume_credit(1, note=f"AI template: {payload.template_key}"):
        raise HTTPException(402, "Kredi yetersiz. PAKETİM ekranından paketinizi yükseltin.")
    job = {
        'id': new_id(),
        'status': 'pending',
        'template_key': payload.template_key,
        'context': payload.context,
        'aspect_ratio': payload.aspect_ratio,
        'quality': payload.quality,
        'title': payload.title,
        'created_by': user.get('id'),
        'created_at': now_iso(),
    }
    await db.ai_media_jobs.insert_one(dict(job))
    job.pop('_id', None)
    # Schedule one-shot background run via APScheduler (coroutine factory)
    try:
        mackolik_scheduler.schedule_once(lambda jid=job['id']: _run_ai_job(jid))
    except Exception:
        asyncio.create_task(_run_ai_job(job['id']))
    return job

@api_router.get("/admin/ai/jobs")
async def admin_ai_jobs(limit: int = 30, user=Depends(require_admin)):
    rows = await db.ai_media_jobs.find({}, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
    return rows

@api_router.get("/admin/ai/jobs/{job_id}")
async def admin_ai_job(job_id: str, user=Depends(require_admin)):
    j = await db.ai_media_jobs.find_one({'id': job_id}, {'_id': 0})
    if not j:
        raise HTTPException(404, "İş bulunamadı")
    return j

# Archive list with filters
@api_router.get("/admin/media-archive")
async def admin_media_archive(source: Optional[str] = None, limit: int = 200, user=Depends(require_admin)):
    q: Dict[str, Any] = {'is_deleted': {'$ne': True}}
    if source:
        q['source'] = source
    rows = await db.media.find(q, {'_id': 0}).sort('created_at', -1).limit(min(limit, 500)).to_list(min(limit, 500))
    return rows

class MediaDeleteIn(BaseModel):
    id: str

@api_router.post("/admin/media/soft-delete")
async def admin_media_soft_delete(payload: MediaDeleteIn, user=Depends(require_admin)):
    res = await db.media.update_one({'id': payload.id}, {'$set': {'is_deleted': True, 'deleted_at': now_iso()}})
    if not res.matched_count:
        raise HTTPException(404, "Medya bulunamadı")
    return {'ok': True}

# Public media proxy (no auth) — so <img src> works directly
from fastapi.responses import Response

@api_router.get("/public/media/{path:path}")
async def public_media(path: str):
    m = await db.media.find_one({'storage_path': path, 'is_deleted': {'$ne': True}}, {'_id': 0})
    if not m:
        raise HTTPException(404, "Görsel bulunamadı")
    try:
        data, ctype = await object_storage.get_bytes(path)
    except Exception as e:
        raise HTTPException(502, f"Depolama hatası: {e}")
    return Response(content=data, media_type=ctype or "image/png", headers={"Cache-Control": "public, max-age=86400"})

# Media library — accept base64 uploads from frontend
class MediaUploadIn(BaseModel):
    title: str
    data_url: str  # data:image/...;base64,...
    type: str = "image"

@api_router.post("/admin/media/upload")
async def admin_media_upload(payload: MediaUploadIn, user=Depends(require_admin)):
    return await _create('media', {
        'title': payload.title,
        'type': payload.type,
        'source': 'upload',
        'data_url': payload.data_url,
    })

# ─────────────────────────── Subscription Packages ───────────────────────────
PLAN_LIMITS = {
    'starter': {'monthly_credit_limit': 30, 'display_name': 'Starter'},
    'plus':    {'monthly_credit_limit': 100, 'display_name': 'Plus'},
    'pro':     {'monthly_credit_limit': 500, 'display_name': 'Pro'},
}

def _current_year_month() -> str:
    dt = datetime.now(timezone.utc)
    return f"{dt.year:04d}-{dt.month:02d}"

async def _ensure_subscription_doc() -> dict:
    """Get or create the default subscription doc (id=main). Auto-resets monthly credits."""
    doc = await db.subscriptions.find_one({'id': 'main'}, {'_id': 0})
    now_ym = _current_year_month()
    if not doc:
        defaults = PLAN_LIMITS['starter']
        doc = {
            'id': 'main',
            'plan_name': 'starter',
            'plan_display_name': defaults['display_name'],
            'monthly_credit_limit': defaults['monthly_credit_limit'],
            'credit_balance': defaults['monthly_credit_limit'],
            'last_reset_year_month': now_ym,
            'total_used_all_time': 0,
            'transactions': [],
            'created_at': now_iso(),
            'updated_at': now_iso(),
        }
        await db.subscriptions.insert_one(dict(doc))
        doc.pop('_id', None)
    # Monthly auto-reset
    if doc.get('last_reset_year_month') != now_ym:
        limit = doc.get('monthly_credit_limit', 30)
        await db.subscriptions.update_one(
            {'id': 'main'},
            {'$set': {
                'credit_balance': limit,
                'last_reset_year_month': now_ym,
                'updated_at': now_iso(),
            }, '$push': {'transactions': {
                'type': 'monthly_reset', 'amount': limit,
                'balance_after': limit, 'at': now_iso(),
                'note': f'Aylık kredi yenilendi ({now_ym})',
            }}},
        )
        doc = await db.subscriptions.find_one({'id': 'main'}, {'_id': 0})
    return doc

class SubscriptionPlanIn(BaseModel):
    plan_name: Literal['starter', 'plus', 'pro']

class CreditAdjustIn(BaseModel):
    amount: int  # positive to add, negative to deduct
    note: Optional[str] = None

@api_router.get("/admin/subscription")
async def admin_get_subscription(user=Depends(require_admin)):
    doc = await _ensure_subscription_doc()
    # Trim transactions to last 50 for response
    tx = doc.get('transactions', [])
    doc['transactions'] = tx[-50:][::-1]
    return doc

@api_router.put("/admin/subscription/plan")
async def admin_set_subscription_plan(payload: SubscriptionPlanIn, user=Depends(require_admin)):
    if user.get('role') != 'super_admin':
        raise HTTPException(403, "Sadece süper admin paketi değiştirebilir")
    plan = PLAN_LIMITS[payload.plan_name]
    await _ensure_subscription_doc()
    await db.subscriptions.update_one(
        {'id': 'main'},
        {'$set': {
            'plan_name': payload.plan_name,
            'plan_display_name': plan['display_name'],
            'monthly_credit_limit': plan['monthly_credit_limit'],
            'credit_balance': plan['monthly_credit_limit'],
            'last_reset_year_month': _current_year_month(),
            'updated_at': now_iso(),
        }, '$push': {'transactions': {
            'type': 'plan_change', 'amount': plan['monthly_credit_limit'],
            'balance_after': plan['monthly_credit_limit'], 'at': now_iso(),
            'note': f"Paket değişti → {plan['display_name']}",
        }}},
    )
    doc = await db.subscriptions.find_one({'id': 'main'}, {'_id': 0})
    doc['transactions'] = doc.get('transactions', [])[-50:][::-1]
    return doc

@api_router.post("/admin/subscription/credit-adjust")
async def admin_credit_adjust(payload: CreditAdjustIn, user=Depends(require_admin)):
    if user.get('role') != 'super_admin':
        raise HTTPException(403, "Sadece süper admin kredi ayarlayabilir")
    doc = await _ensure_subscription_doc()
    new_bal = max(0, int(doc.get('credit_balance', 0)) + int(payload.amount))
    await db.subscriptions.update_one(
        {'id': 'main'},
        {'$set': {'credit_balance': new_bal, 'updated_at': now_iso()},
         '$push': {'transactions': {
             'type': 'manual_adjust', 'amount': payload.amount,
             'balance_after': new_bal, 'at': now_iso(),
             'note': payload.note or ('Manuel ekleme' if payload.amount > 0 else 'Manuel düşüm'),
         }}},
    )
    return {'ok': True, 'credit_balance': new_bal}

async def consume_credit(n: int = 1, note: str = "AI media generate") -> bool:
    """Deduct credits; returns False if insufficient. Used by AI endpoints."""
    doc = await _ensure_subscription_doc()
    if int(doc.get('credit_balance', 0)) < n:
        return False
    new_bal = int(doc.get('credit_balance', 0)) - n
    await db.subscriptions.update_one(
        {'id': 'main'},
        {'$set': {
            'credit_balance': new_bal,
            'total_used_all_time': int(doc.get('total_used_all_time', 0)) + n,
            'updated_at': now_iso(),
        }, '$push': {'transactions': {
            'type': 'usage', 'amount': -n, 'balance_after': new_bal,
            'at': now_iso(), 'note': note,
        }}},
    )
    return True

# ─────────────────────────── Dashboard Stats ───────────────────────────
def _parse_birth(b) -> Optional[datetime]:
    if not b:
        return None
    try:
        if isinstance(b, str):
            # Accept YYYY-MM-DD or ISO
            s = b[:10]
            return datetime.strptime(s, '%Y-%m-%d')
    except Exception:
        return None
    return None

async def _upcoming_birthdays(days_ahead: int = 30) -> List[dict]:
    """Return players whose birthday falls in next N days (month/day based)."""
    rows = await db.players.find({'active': {'$ne': False}}, {'_id': 0}).to_list(500)
    today = datetime.now(timezone.utc).date()
    out = []
    for p in rows:
        bd = _parse_birth(p.get('birth_date'))
        if not bd:
            continue
        # Next occurrence this year or next
        try:
            this_year = bd.replace(year=today.year).date()
        except ValueError:
            continue
        delta = (this_year - today).days
        if delta < 0:
            try:
                next_year = bd.replace(year=today.year + 1).date()
                delta = (next_year - today).days
                upcoming_date = next_year
            except ValueError:
                continue
        else:
            upcoming_date = this_year
        if 0 <= delta <= days_ahead:
            age_turning = upcoming_date.year - bd.year
            out.append({
                'id': p.get('id'),
                'slug': p.get('slug'),
                'name': p.get('name'),
                'photo_url': p.get('photo_url'),
                'position': p.get('position'),
                'jersey_number': p.get('jersey_number'),
                'birth_date': p.get('birth_date'),
                'upcoming_date': upcoming_date.isoformat(),
                'days_until': delta,
                'turning_age': age_turning,
            })
    out.sort(key=lambda x: x['days_until'])
    return out

@api_router.get("/admin/dashboard/birthdays")
async def admin_birthdays(days: int = 30, user=Depends(require_admin)):
    return await _upcoming_birthdays(days_ahead=days)

@api_router.get("/admin/dashboard/stats")
async def admin_dashboard_stats(user=Depends(require_admin)):
    [posts_total, posts_pub, posts_draft, players_active, sponsors_active,
     upcoming_matches, applications_new, messages_unread, media_total] = await asyncio.gather(
        db.posts.count_documents({}),
        db.posts.count_documents({'status': 'published'}),
        db.posts.count_documents({'status': 'draft'}),
        db.players.count_documents({'active': {'$ne': False}}),
        db.sponsors.count_documents({'active': {'$ne': False}}),
        db.matches.count_documents({'status': 'upcoming'}),
        db.academy_applications.count_documents({'status': 'new'}),
        db.contact_messages.count_documents({'status': 'unread'}),
        db.media.count_documents({}),
    )
    recent_apps = await db.academy_applications.find({}, {'_id': 0}).sort('created_at', -1).limit(5).to_list(5)
    recent_msgs = await db.contact_messages.find({}, {'_id': 0}).sort('created_at', -1).limit(5).to_list(5)
    birthdays = await _upcoming_birthdays(days_ahead=30)
    macko = await db.site_settings.find_one({'id': 'mackolik'}, {'_id': 0}) or {}
    subscription = await _ensure_subscription_doc()
    return {
        'posts_total': posts_total,
        'posts_published': posts_pub,
        'posts_draft': posts_draft,
        'players_active': players_active,
        'sponsors_active': sponsors_active,
        'upcoming_matches': upcoming_matches,
        'applications_new': applications_new,
        'messages_unread': messages_unread,
        'media_total': media_total,
        'recent_applications': recent_apps,
        'recent_messages': recent_msgs,
        'upcoming_birthdays': birthdays[:6],
        'mackolik': {
            'enabled': macko.get('enabled', False),
            'team_display_name': macko.get('team_display_name'),
            'last_sync_at': macko.get('last_sync_at'),
            'last_sync_status': macko.get('last_sync_status'),
            'last_sync_summary': macko.get('last_sync_summary'),
        },
        'subscription': {
            'plan_name': subscription.get('plan_name'),
            'plan_display_name': subscription.get('plan_display_name'),
            'credit_balance': subscription.get('credit_balance'),
            'monthly_credit_limit': subscription.get('monthly_credit_limit'),
            'last_reset_year_month': subscription.get('last_reset_year_month'),
        },
    }

# ─────────────────────────── Health ───────────────────────────
@api_router.get("/")
async def root():
    return {'service': 'Livanespor API', 'status': 'ok', 'version': '1.0.0'}

@api_router.get("/health")
async def health():
    try:
        await db.command('ping')
        return {'ok': True, 'db': 'up'}
    except Exception as e:
        return {'ok': False, 'db': str(e)}

# ─────────────────────────── App wiring ───────────────────────────
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prevent CDN/browser caching of API responses so admin updates are visible immediately
@app.middleware("http")
async def no_cache_api(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─────────────────────────── Seed Data ───────────────────────────
async def seed_admin():
    """Seed super_admin from .env ONLY if no super_admin exists.
    Once created, panel-managed credentials are preserved across restarts.
    """
    existing = await db.users.find_one({'role': 'super_admin'})
    if existing:
        logger.info(f"super_admin already exists (username={existing.get('email')}); skipping seed")
        return
    username = DEFAULT_ADMIN_EMAIL.lower().strip()
    pw_hash = hash_password(DEFAULT_ADMIN_PASSWORD)
    await db.users.insert_one({
        'id': new_id(),
        'email': username,
        'name': DEFAULT_ADMIN_NAME,
        'role': 'super_admin',
        'password_hash': pw_hash,
        'created_at': now_iso(),
    })
    logger.info(f"Seeded admin user: {username}")

async def seed_content():
    if await db.site_settings.find_one({'id': 'main'}):
        return
    logger.info("Seeding initial Livanespor content…")

    # Site settings
    await db.site_settings.insert_one({
        'id': 'main',
        'site_title': 'Livanespor — Resmi Web Sitesi',
        'site_description': 'Bursa Nilüfer merkezli Livanespor futbol kulübü. A Takım, Akademi, Haberler.',
        'logo_url': 'https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png',
        'favicon_url': 'https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png',
        'phone': '0543 793 4101',
        'email': 'bilgi@livanespor.org',
        'address': 'Yolçatı, Nilüfer / Bursa',
        'manager_name': 'Ali Özer',
        'map_url': 'https://maps.app.goo.gl/NKoYnqsX9hdp5k2T8',
        'social': {'instagram': '', 'twitter': '', 'youtube': '', 'facebook': ''},
        'season': '2025-2026',
        'updated_at': now_iso(),
    })

    # Hero slides
    hero_slides = [
        {
            'id': new_id(), 'order': 1, 'active': True,
            'title': 'LİVANESPOR',
            'subtitle': 'Bursa Nilüfer\'in Yükselen Gücü',
            'description': 'Sıradaki maçımıza tüm Livane ailesini bekliyoruz. Tribünleri sarı-siyah ile dolduralım.',
            'image_url': 'https://images.pexels.com/photos/12616082/pexels-photo-12616082.jpeg',
            'cta_primary_label': 'Maç Merkezi', 'cta_primary_link': '/mac-merkezi',
            'cta_secondary_label': 'Akademi Başvurusu', 'cta_secondary_link': '/akademi/basvuru',
            'created_at': now_iso(), 'updated_at': now_iso(),
        },
        {
            'id': new_id(), 'order': 2, 'active': True,
            'title': 'AKADEMİ KAYITLARI AÇIK',
            'subtitle': 'U8 — U17 Yaş Grupları',
            'description': 'Geleceğin yıldızları Livanespor Akademi\'de yetişiyor. Hemen başvur, denemeye davet et.',
            'image_url': 'https://images.pexels.com/photos/26283685/pexels-photo-26283685.jpeg',
            'cta_primary_label': 'Hemen Başvur', 'cta_primary_link': '/akademi/basvuru',
            'cta_secondary_label': 'Yaş Gruplarını Gör', 'cta_secondary_link': '/akademi/yas-gruplari',
            'created_at': now_iso(), 'updated_at': now_iso(),
        },
        {
            'id': new_id(), 'order': 3, 'active': True,
            'title': 'YOLÇATI TESİSİMİZ',
            'subtitle': 'Modern, Profesyonel, Bizim Evimiz',
            'description': 'Antrenmanlarımız ve maçlarımız Yolçatı\'daki tesisimizde gerçekleşiyor.',
            'image_url': 'https://images.unsplash.com/photo-1762013315117-1c8005ad2b41',
            'cta_primary_label': 'İletişim', 'cta_primary_link': '/iletisim',
            'cta_secondary_label': 'Kulüp Hakkında', 'cta_secondary_link': '/kulup',
            'created_at': now_iso(), 'updated_at': now_iso(),
        },
    ]
    await db.hero_slides.insert_many(hero_slides)

    # Players
    players = [
        ('Mert Yılmaz', 1, 'Kaleci', 24, 188, 'Sağ', True, False, False),
        ('Emre Kaya', 4, 'Defans', 26, 184, 'Sağ', False, False, False),
        ('Burak Demir', 5, 'Defans', 23, 182, 'Sol', False, False, True),
        ('Onur Şahin', 8, 'Orta Saha', 25, 178, 'Sağ', False, True, False),
        ('Cem Aslan', 10, 'Orta Saha', 27, 176, 'Sol', False, False, False),
        ('Kerem Yıldız', 9, 'Forvet', 24, 181, 'Sağ', False, False, False),
    ]
    portraits = [
        'https://images.unsplash.com/photo-1514932535303-f7b1712cf831',
        'https://images.unsplash.com/photo-1570095354203-130e525ae0e1',
        'https://images.unsplash.com/photo-1517466787929-bc90951d0974',
        'https://images.unsplash.com/photo-1552058544-f2b08422138a',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e',
    ]
    for i, (name, num, pos, age, height, foot, captain, top_scorer, top_assist) in enumerate(players):
        slug = make_slug(name, "")
        await db.players.insert_one({
            'id': new_id(), 'slug': slug, 'name': name, 'jersey_number': num,
            'position': pos, 'age': age, 'birth_year': 2026 - age, 'height_cm': height,
            'preferred_foot': foot, 'is_captain': captain, 'top_scorer': top_scorer, 'top_assist': top_assist,
            'is_featured': i < 3, 'active': True,
            'photo_url': portraits[i],
            'bio': f'{name}, Livanespor formasını gururla taşıyan {pos.lower()} mevkiindeki oyuncularımızdandır.',
            'stats': {'matches': 18 + i, 'goals': 6 - i if pos == 'Forvet' else max(0, 4 - i), 'assists': 5 - i, 'yellow_cards': i, 'red_cards': 0},
            'gallery': [], 'social': {},
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Staff
    staff = [
        ('Hakan Türker', 'Teknik Direktör', 'a-team', 'UEFA A lisanslı, 18 yıllık tecrübe.'),
        ('Serkan Arslan', 'Yardımcı Antrenör', 'a-team', 'Defans ve set-piece sorumlusu.'),
        ('Ayşe Korkmaz', 'Akademi Direktörü', 'academy', 'Genç oyuncu gelişiminde 12 yıllık tecrübe.'),
    ]
    for i, (name, role, cat, bio) in enumerate(staff):
        await db.staff.insert_one({
            'id': new_id(), 'slug': make_slug(name), 'name': name, 'role_title': role,
            'category': cat, 'bio': bio, 'photo_url': portraits[i % len(portraits)],
            'order': i + 1, 'active': True, 'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Matches
    matches_data = [
        {'opponent': 'Nilüfer FK', 'is_home': True, 'date_offset_days': 4, 'status': 'upcoming', 'home_score': None, 'away_score': None, 'venue': 'Yolçatı Tesisi'},
        {'opponent': 'Bursa Gençlik', 'is_home': False, 'date_offset_days': 11, 'status': 'upcoming', 'home_score': None, 'away_score': None, 'venue': 'Bursa Atatürk Stadı'},
        {'opponent': 'Mudanya Spor', 'is_home': True, 'date_offset_days': 18, 'status': 'upcoming', 'home_score': None, 'away_score': None, 'venue': 'Yolçatı Tesisi'},
        {'opponent': 'Gemlik United', 'is_home': True, 'date_offset_days': -5, 'status': 'finished', 'home_score': 3, 'away_score': 1, 'venue': 'Yolçatı Tesisi'},
        {'opponent': 'Karacabey Spor', 'is_home': False, 'date_offset_days': -12, 'status': 'finished', 'home_score': 0, 'away_score': 2, 'venue': 'Karacabey Stadı'},
    ]
    for i, m in enumerate(matches_data):
        match_dt = datetime.now(timezone.utc) + timedelta(days=m['date_offset_days'])
        home_team = 'Livanespor' if m['is_home'] else m['opponent']
        away_team = m['opponent'] if m['is_home'] else 'Livanespor'
        await db.matches.insert_one({
            'id': new_id(), 'season': '2025-2026', 'competition': 'BAL Ligi 4. Grup',
            'home_team': home_team, 'away_team': away_team,
            'opponent': m['opponent'], 'is_home': m['is_home'],
            'home_score': m['home_score'], 'away_score': m['away_score'],
            'match_date': match_dt.isoformat(), 'venue': m['venue'],
            'status': m['status'],
            'summary': 'Maç önü değerlendirmesi yakında.' if m['status'] == 'upcoming' else 'Mücadeleci bir 90 dakikaydı.',
            'opponent_logo': '',
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Standings
    teams = ['Livanespor', 'Nilüfer FK', 'Bursa Gençlik', 'Mudanya Spor', 'Gemlik United', 'Karacabey Spor', 'İnegöl Genç', 'Orhangazi Spor']
    for i, team in enumerate(teams):
        played = 12
        wins = 8 - i if i < 6 else 2
        draws = 2
        losses = played - wins - draws
        gf = 24 - i * 2
        ga = 8 + i * 2
        await db.standings.insert_one({
            'id': new_id(), 'rank': i + 1, 'team_name': team, 'logo_url': '',
            'played': played, 'wins': max(wins, 0), 'draws': draws, 'losses': max(losses, 0),
            'goals_for': max(gf, 0), 'goals_against': max(ga, 0),
            'goal_difference': max(gf, 0) - max(ga, 0),
            'points': max(wins, 0) * 3 + draws,
            'season': '2025-2026',
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Sponsors
    sponsors_data = [
        ('EVSER HALI', 'forma', 'club', 'Ana Forma Sponsorumuz', 'https://example.com', 1),
        ('Nilüfer İnşaat', 'main', 'club', 'Resmi Ana Sponsorumuz', 'https://example.com', 2),
        ('Yolçatı Restaurant', 'supporter', 'both', 'Destekçimiz', '', 3),
        ('EVSER HALI - U15', 'jersey', 'academy', 'U15 Forma Sponsoru', '', 4),
    ]
    for name, level, scope, desc, link, order in sponsors_data:
        await db.sponsors.insert_one({
            'id': new_id(), 'slug': make_slug(name), 'name': name, 'level': level,
            'scope': scope, 'description': desc, 'website': link,
            'logo_url': '', 'order': order, 'active': True,
            'age_group': 'U15' if 'U15' in name else None,
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Academy groups
    age_groups = [
        ('U8', '6-8 yaş', 'Temel motor beceriler ve futbolla tanışma.'),
        ('U10', '9-10 yaş', 'Top hakimiyeti ve takım oyunu temelleri.'),
        ('U12', '11-12 yaş', 'Pozisyon bilinci ve teknik gelişim.'),
        ('U14', '13-14 yaş', 'Taktiksel anlayış ve fiziksel gelişim.'),
        ('U15', '14-15 yaş', 'EVSER HALI forma sponsorlu özel program.'),
        ('U17', '16-17 yaş', 'Profesyonelliğe hazırlık ve bireysel gelişim.'),
    ]
    for i, (code, age, desc) in enumerate(age_groups):
        await db.academy_groups.insert_one({
            'id': new_id(), 'slug': code.lower(), 'name': code, 'age_range': age,
            'description': desc, 'order': i + 1, 'active': True,
            'training_days_summary': 'Salı, Perşembe, Cumartesi',
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Training sessions
    sessions = [
        ('U8', 'Salı', '17:00-18:00', 'Saha 1', 'Ayşe Korkmaz'),
        ('U10', 'Salı', '18:00-19:00', 'Saha 1', 'Ayşe Korkmaz'),
        ('U12', 'Perşembe', '17:30-19:00', 'Saha 2', 'Hakan Türker'),
        ('U14', 'Perşembe', '19:00-20:30', 'Saha 2', 'Hakan Türker'),
        ('U15', 'Cumartesi', '10:00-11:30', 'Saha 1', 'Serkan Arslan'),
        ('U17', 'Cumartesi', '11:30-13:00', 'Saha 1', 'Serkan Arslan'),
    ]
    day_order = {'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6, 'Pazar': 7}
    for grp, day, hrs, field, coach in sessions:
        await db.training_sessions.insert_one({
            'id': new_id(), 'group_code': grp, 'day_of_week': day_order[day], 'day_name': day,
            'time_range': hrs, 'field': field, 'coach': coach,
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Categories
    categories_data = [
        ('Kulüp Haberleri', 'kulup-haberleri', 'club'),
        ('Maç Önü', 'mac-onu', 'club'),
        ('Maç Sonu', 'mac-sonu', 'club'),
        ('Duyurular', 'duyurular', 'club'),
        ('Transfer', 'transfer', 'club'),
        ('Akademi Haberleri', 'akademi-haberleri', 'academy'),
        ('Sponsor Haberleri', 'sponsor-haberleri', 'club'),
        ('Etkinlikler', 'etkinlikler', 'both'),
    ]
    for n, s, scope in categories_data:
        await db.categories.insert_one({
            'id': new_id(), 'name': n, 'slug': s, 'scope': scope,
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Posts
    posts_data = [
        ('Livanespor 3-1 Gemlik United: Tribünlerin Önünde Tarihi Galibiyet', 'mac-sonu', 'Yolçatı\'da oynadığımız maçta sahadan 3-1\'lik galibiyetle ayrıldık. Goller: Kerem (2), Cem.'),
        ('Akademi Kayıtları Başladı: U8\'den U17\'ye Tüm Yaş Grupları Açık', 'akademi-haberleri', 'Yeni sezon akademi kayıtlarımız başladı. Online başvuru formu üzerinden hemen kayıt olabilirsiniz.'),
        ('EVSER HALI U15 Forma Sponsorumuz Oldu', 'sponsor-haberleri', 'Bu sezon U15 takımımızın forma sponsoru EVSER HALI olacak. Hayırlı uğurlu olsun.'),
        ('Hafta Sonu Nilüfer FK Karşısında Sahaya Çıkıyoruz', 'mac-onu', 'Pazar günü Yolçatı\'da Nilüfer FK\'yı ağırlıyoruz. Tüm taraftarlarımızı bekliyoruz.'),
    ]
    cover_images = [
        'https://images.pexels.com/photos/12616082/pexels-photo-12616082.jpeg',
        'https://images.pexels.com/photos/26283685/pexels-photo-26283685.jpeg',
        'https://images.unsplash.com/photo-1762013315117-1c8005ad2b41',
        'https://images.unsplash.com/photo-1773850561705-dacec6d0b16b',
    ]
    for i, (title, cat, content) in enumerate(posts_data):
        await db.posts.insert_one({
            'id': new_id(), 'slug': make_slug(title),
            'title': title, 'category': cat,
            'excerpt': content,
            'content': f'<p>{content}</p><p>Detaylı bilgi için kulübümüzle iletişime geçebilirsiniz. Livanespor olarak her zaman taraftarımızın yanındayız.</p>',
            'cover_image': cover_images[i],
            'gallery': [],
            'tags': ['livanespor', cat],
            'author': 'Livanespor',
            'status': 'published',
            'published_at': (datetime.now(timezone.utc) - timedelta(days=i)).isoformat(),
            'seo_title': title,
            'seo_description': content[:155],
            'og_image': cover_images[i],
            'created_at': now_iso(), 'updated_at': now_iso(),
        })

    # Sample academy application
    await db.academy_applications.insert_one({
        'id': new_id(),
        'application_no': f"LIV-{datetime.now().strftime('%Y%m')}-DEMO1",
        'player_name': 'Demo Çocuk', 'birth_date': '2015-05-10', 'age': 10,
        'parent_name': 'Demo Veli', 'phone': '0555 000 0000', 'email': 'demo@example.com',
        'city': 'Bursa', 'district': 'Nilüfer', 'address': 'Yolçatı',
        'position_preference': 'Orta Saha',
        'previous_club': '', 'has_license': False,
        'health_note': 'Yok', 'emergency_contact': '0555 111 1111',
        'note': 'Örnek başvuru kaydıdır.',
        'kvkk_consent': True,
        'status': 'new',
        'age_group': 'U10',
        'created_at': now_iso(), 'updated_at': now_iso(),
    })

    logger.info("Seed complete.")

@app.on_event("startup")
async def startup_event():
    await seed_admin()
    await seed_content()
    # Ensure indexes
    try:
        await db.users.create_index('email', unique=True)
        await db.posts.create_index('slug', unique=True, sparse=True)
        await db.players.create_index('slug', unique=True, sparse=True)
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
    # Mackolik auto-sync scheduler
    try:
        import mackolik_scheduler
        mackolik_scheduler.init(db)
        await mackolik_scheduler.reschedule_from_db()
    except Exception as e:
        logger.warning(f"Mackolik scheduler init warning: {e}")
    # Object storage init (Phase 3)
    try:
        await object_storage.init_storage()
    except Exception as e:
        logger.warning(f"Object storage init warning: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
