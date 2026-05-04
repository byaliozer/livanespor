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
import httpx
from slugify import slugify
from openai import AsyncOpenAI
from emergentintegrations.llm.chat import LlmChat, UserMessage

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

async def require_super_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Only super_admin can access: AI settings, subscription plan, credit adjust, user management."""
    if user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Bu işlem yalnızca Süper Admin tarafından yapılabilir")
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
    from seeds import seed_admin as _seed_admin_fn
    await _seed_admin_fn(db, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_NAME)
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
async def list_users(user=Depends(require_super_admin)):
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
    'team_photos': {'public': False, 'slug_field': None},
    'opponent_clubs': {'public': False, 'slug_field': 'name'},
    'team_trainings': {'public': False, 'slug_field': None},
    'attendance_records': {'public': False, 'slug_field': None},
    'finance_transactions': {'public': False, 'slug_field': None},
    'player_contracts': {'public': False, 'slug_field': None},
    'player_payments': {'public': False, 'slug_field': None},
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

# ─────────────────────────── Attendance (Yoklama) ───────────────────────────
class AttendanceEntry(BaseModel):
    player_id: str
    status: Literal["present", "absent"]
    reason: Optional[str] = None


class AttendanceSaveIn(BaseModel):
    entries: List[AttendanceEntry]


@api_router.get("/admin/trainings/{training_id}/attendance")
async def admin_get_attendance(training_id: str, user=Depends(require_admin)):
    """Return existing attendance records for a training (player_id → status, reason)."""
    rows = await db.attendance_records.find({'training_id': training_id}, {'_id': 0}).to_list(500)
    return rows


@api_router.post("/admin/trainings/{training_id}/attendance")
async def admin_save_attendance(training_id: str, payload: AttendanceSaveIn, user=Depends(require_admin)):
    """Bulk-upsert attendance records for a training. Validates that absent entries have a reason."""
    training = await db.team_trainings.find_one({'id': training_id}, {'_id': 0})
    if not training:
        raise HTTPException(404, "Antrenman bulunamadı")
    # Validate reasons
    for e in payload.entries:
        if e.status == "absent" and not (e.reason or "").strip():
            raise HTTPException(400, f"Gelmeyen oyuncu için sebep zorunludur (player_id={e.player_id})")
    # Players lookup for denormalization
    pids = [e.player_id for e in payload.entries]
    players = await db.players.find({'id': {'$in': pids}}, {'_id': 0, 'id': 1, 'name': 1, 'jersey_number': 1, 'position': 1, 'photo_url': 1}).to_list(500)
    p_map = {p['id']: p for p in players}
    # Delete existing records for this training, then insert fresh
    await db.attendance_records.delete_many({'training_id': training_id})
    docs = []
    now = now_iso()
    for e in payload.entries:
        p = p_map.get(e.player_id) or {}
        docs.append({
            'id': new_id(),
            'training_id': training_id,
            'training_group': training.get('group_label'),
            'training_date': training.get('date'),
            'training_time': training.get('time_range'),
            'player_id': e.player_id,
            'player_name': p.get('name'),
            'player_jersey': p.get('jersey_number'),
            'player_position': p.get('position'),
            'player_photo': p.get('photo_url'),
            'status': e.status,
            'reason': (e.reason or "").strip() if e.status == "absent" else None,
            'recorded_by': user.get('id'),
            'recorded_at': now,
        })
    if docs:
        await db.attendance_records.insert_many(docs)
    # Mark training as "yoklama_alındı"
    await db.team_trainings.update_one({'id': training_id}, {'$set': {'attendance_taken': True, 'attendance_at': now, 'updated_at': now}})
    return {'ok': True, 'saved': len(docs)}


@api_router.get("/admin/players/{player_id}/attendance-history")
async def admin_player_attendance_history(player_id: str, limit: int = 10, user=Depends(require_admin)):
    """Return last N attendance records for a player + summary stats."""
    rows = await db.attendance_records.find({'player_id': player_id}, {'_id': 0}).sort('training_date', -1).limit(max(1, min(limit, 100))).to_list(100)
    all_rows = await db.attendance_records.find({'player_id': player_id}, {'_id': 0, 'status': 1}).to_list(2000)
    total = len(all_rows)
    present = sum(1 for r in all_rows if r.get('status') == 'present')
    absent = total - present
    pct = round((present / total) * 100) if total > 0 else None
    return {
        'recent': rows,
        'total_count': total,
        'present_count': present,
        'absent_count': absent,
        'attendance_pct': pct,
    }


# ─────────────────────────── Player Financial Summary ───────────────────────────
@api_router.get("/admin/players/{player_id}/financial-summary")
async def admin_player_financial(player_id: str, user=Depends(require_admin)):
    """Return contract + total paid + breakdown by payment_type for a player."""
    contracts = await db.player_contracts.find({'player_id': player_id}, {'_id': 0}).sort('start_date', -1).to_list(50)
    payments = await db.player_payments.find({'player_id': player_id}, {'_id': 0}).sort('date', -1).to_list(500)
    total_paid = sum(float(p.get('amount') or 0) for p in payments)
    by_type: Dict[str, float] = {}
    for p in payments:
        t = p.get('payment_type') or 'diğer'
        by_type[t] = by_type.get(t, 0) + float(p.get('amount') or 0)
    today_iso = datetime.now(timezone.utc).date().isoformat()
    active_contract = next((c for c in contracts if not c.get('end_date') or c.get('end_date') >= today_iso), None)
    contracted = float(active_contract.get('total_amount') or 0) if active_contract else 0
    return {
        'contracts': contracts,
        'active_contract': active_contract,
        'payments': payments,
        'total_paid': total_paid,
        'contracted_amount': contracted,
        'remaining': max(0, contracted - total_paid) if contracted else None,
        'by_type': by_type,
    }


# ─────────────────────────── Finance Summary ───────────────────────────
@api_router.get("/admin/finance/summary")
async def admin_finance_summary(user=Depends(require_admin)):
    """Monthly cash position + last 6 months chart + category breakdown."""
    rows = await db.finance_transactions.find({}, {'_id': 0}).sort('date', -1).to_list(5000)
    today = datetime.now(timezone.utc).date()
    this_month_key = f"{today.year}-{today.month:02d}"
    months: List[str] = []
    cm = today.replace(day=1)
    for _ in range(6):
        months.append(f"{cm.year}-{cm.month:02d}")
        cm = cm.replace(year=cm.year - 1, month=12) if cm.month == 1 else cm.replace(month=cm.month - 1)
    months = list(reversed(months))
    chart = {m: {'income': 0.0, 'expense': 0.0, 'net': 0.0} for m in months}
    by_category: Dict[str, Dict[str, float]] = {}
    this_month = {'income': 0.0, 'expense': 0.0, 'net': 0.0}
    for r in rows:
        d = (r.get('date') or '')[:10]
        if not d:
            continue
        mk = d[:7]
        amount = float(r.get('amount') or 0)
        ttype = r.get('type') or 'expense'
        if mk in chart:
            if ttype == 'income':
                chart[mk]['income'] += amount
            else:
                chart[mk]['expense'] += amount
            chart[mk]['net'] = chart[mk]['income'] - chart[mk]['expense']
        if mk == this_month_key:
            if ttype == 'income':
                this_month['income'] += amount
            else:
                this_month['expense'] += amount
            this_month['net'] = this_month['income'] - this_month['expense']
        cat = r.get('category') or 'Diğer'
        slot = by_category.setdefault(cat, {'income': 0.0, 'expense': 0.0})
        slot[ttype if ttype in ('income', 'expense') else 'expense'] += amount
    last_month_key = months[-2] if len(months) >= 2 else None
    last_month_net = chart[last_month_key]['net'] if last_month_key else 0
    chart_list = [{'month': m, **chart[m]} for m in months]
    pending_total = sum(float(r.get('amount') or 0) for r in rows if r.get('paid') is False and r.get('type') == 'income')
    pending_count = sum(1 for r in rows if r.get('paid') is False)
    return {
        'this_month': this_month,
        'this_month_key': this_month_key,
        'last_month_net': last_month_net,
        'chart': chart_list,
        'by_category': by_category,
        'pending_count': pending_count,
        'pending_total': pending_total,
        'recent': rows[:10],
    }


# ─────────────────────────── Match Pre-Game Analysis (AI) ───────────────────────────
class MatchAnalysisGenerateIn(BaseModel):
    match_id: str


@api_router.get("/admin/match-analysis/{match_id}")
async def admin_get_match_analysis(match_id: str, user=Depends(require_admin)):
    # Lazy auto-reset: if match is finished, delete the report
    match = await db.matches.find_one({'id': match_id}, {'_id': 0, 'status': 1})
    if match and match.get('status') == 'finished':
        await db.match_reports.delete_one({'match_id': match_id})
        return {}
    rep = await db.match_reports.find_one({'match_id': match_id}, {'_id': 0})
    return rep or {}


@api_router.post("/admin/match-analysis/generate")
async def admin_generate_match_analysis(payload: MatchAnalysisGenerateIn, user=Depends(require_admin)):
    """Generate AI pre-game analysis. Costs 1 credit. Returns existing report if already generated."""
    match = await db.matches.find_one({'id': payload.match_id}, {'_id': 0})
    if not match:
        raise HTTPException(404, "Maç bulunamadı")
    existing = await db.match_reports.find_one({'match_id': payload.match_id}, {'_id': 0})
    if existing:
        return existing

    site = await db.site_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
    own_full = (site.get('site_title') or 'Livanespor').strip()
    own_first = own_full.split()[0] if own_full.split() else own_full
    home_team = match.get('home_team') or ''
    away_team = match.get('away_team') or ''
    we_are_home = own_first.lower() in home_team.lower()
    opponent_name = away_team if we_are_home else home_team

    our_recent = await db.matches.find({'status': 'finished'}, {'_id': 0}).sort('match_date', -1).limit(5).to_list(5)
    our_form = []
    for m in our_recent:
        h_low = (m.get('home_team') or '').lower()
        we_h = own_first.lower() in h_low
        os_ = m.get('home_score') if we_h else m.get('away_score')
        ts_ = m.get('away_score') if we_h else m.get('home_score')
        if os_ is None or ts_ is None:
            continue
        opp = m.get('away_team') if we_h else m.get('home_team')
        result = 'G' if os_ > ts_ else ('B' if os_ == ts_ else 'M')
        our_form.append(f"{result} {opp} {os_}-{ts_} ({'Ev' if we_h else 'Dep'})")

    standings = await db.standings.find({}, {'_id': 0}).sort('rank', 1).to_list(50)
    our_row = next((s for s in standings if own_first.lower() in (s.get('team_name') or '').lower()), None)
    opp_row = next((s for s in standings if opponent_name and (opponent_name.lower() in (s.get('team_name') or '').lower() or (s.get('team_name') or '').lower() in opponent_name.lower())), None)

    h2h = await db.matches.find({
        'status': 'finished',
        '$or': [
            {'home_team': {'$regex': opponent_name, '$options': 'i'}},
            {'away_team': {'$regex': opponent_name, '$options': 'i'}},
        ],
    }, {'_id': 0}).sort('match_date', -1).limit(5).to_list(5)
    h2h_summary = []
    for m in h2h:
        h_l = (m.get('home_team') or '').lower()
        we_h = own_first.lower() in h_l
        os_ = m.get('home_score') if we_h else m.get('away_score')
        ts_ = m.get('away_score') if we_h else m.get('home_score')
        if os_ is None or ts_ is None:
            continue
        h2h_summary.append(f"{(m.get('match_date','') or '')[:10]}: {os_}-{ts_} ({'Ev' if we_h else 'Dep'})")

    players = await db.players.find({'active': {'$ne': False}}, {'_id': 0}).to_list(100)
    top = sorted(players, key=lambda p: -((p.get('stats') or {}).get('goals') or 0))[:3]
    top_scorer_lines = [f"{p.get('name')} (#{p.get('jersey_number','?')}, {p.get('position','?')}) - {(p.get('stats') or {}).get('goals') or 0} gol" for p in top if ((p.get('stats') or {}).get('goals') or 0) > 0]

    ok = await consume_credit(1, note=f"match-analysis: {opponent_name}")
    if not ok:
        raise HTTPException(402, "Yetersiz kredi (1 kredi gerekiyor)")

    facts_block = f"""KULÜP: {own_full}
RAKİP: {opponent_name}
TARİH: {(match.get('match_date') or '')[:10]}
SAHA: {match.get('venue') or '—'} ({'Ev sahibiyiz' if we_are_home else 'Deplasmandayız'})
LİG: {match.get('competition') or '—'}

BİZİM SON 5 MAÇ:
{chr(10).join('- ' + x for x in our_form) if our_form else '- Veri yok'}

LİG DURUMU:
- {own_full}: {f"{our_row.get('rank')}. sıra, {our_row.get('points')} puan, {our_row.get('played')} maç ({our_row.get('wins')}G {our_row.get('draws')}B {our_row.get('losses')}M, {our_row.get('goals_for')}-{our_row.get('goals_against')})" if our_row else 'veri yok'}
- {opponent_name}: {f"{opp_row.get('rank')}. sıra, {opp_row.get('points')} puan, {opp_row.get('played')} maç ({opp_row.get('wins')}G {opp_row.get('draws')}B {opp_row.get('losses')}M, {opp_row.get('goals_for')}-{opp_row.get('goals_against')})" if opp_row else 'veri yok'}

GEÇMİŞ KARŞILAŞMALAR (Bizim açımızdan):
{chr(10).join('- ' + x for x in h2h_summary) if h2h_summary else '- Geçmiş karşılaşma yok'}

BİZİM EN İYİ FORMADA OYUNCULAR:
{chr(10).join('- ' + x for x in top_scorer_lines) if top_scorer_lines else '- Veri yok'}"""

    system_prompt = """Sen bir Türk futbol kulübünün baş analistisin. Görevin: kulüp BAŞKAN'ı ve yönetim kuruluna sunulacak, profesyonel bir maç önü analiz raporu yazmak.

Çıktı formatı: Markdown başlıklarla 5 bölüm:

## 1. Genel Değerlendirme
2-3 cümlede maçın stratejik önemi.

## 2. Bizim Form Analizi
Son 5 maç yorumu, saha avantajı.

## 3. Rakip Analizi
Rakibin lig durumu, güçlü/zayıf yanları, tehlikeli oldukları bölgeler.

## 4. Geçmiş Karşılaşmalar
Veriler varsa özet + psikolojik etki. Yoksa "ilk kez karşılaşıyoruz" bilgisi.

## 5. Tahmin & Öneri
- Olası ilk 11 önerisi (mevki bazlı, kısa).
- Skor tahmini (gerçekçi).
- MOTM adayı (bizim oyuncularımızdan).

KURALLAR:
- VERİDE OLMAYAN ŞEY UYDURMA.
- Veri eksikse açıkça söyle.
- 600-800 kelime. Profesyonel ama özlü."""

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "LLM key tanımlı değil")
    chat = LlmChat(api_key=api_key, session_id=f"match-analysis-{new_id()[:8]}", system_message=system_prompt).with_model("openai", "gpt-5.2")
    raw = await chat.send_message(UserMessage(text=facts_block))
    content = str(raw).strip()

    report = {
        'id': new_id(),
        'match_id': payload.match_id,
        'opponent_name': opponent_name,
        'match_date': (match.get('match_date') or '')[:10],
        'we_are_home': we_are_home,
        'our_form': our_form,
        'h2h_summary': h2h_summary,
        'our_standing': our_row,
        'opp_standing': opp_row,
        'content_markdown': content,
        'generated_at': now_iso(),
        'generated_by': user.get('id'),
        'credits_used': 1,
    }
    await db.match_reports.insert_one(report)
    report.pop('_id', None)
    return report


@api_router.delete("/admin/match-analysis/{match_id}")
async def admin_delete_match_analysis(match_id: str, user=Depends(require_admin)):
    r = await db.match_reports.delete_one({'match_id': match_id})
    return {'ok': True, 'deleted': r.deleted_count}


@api_router.get("/admin/match-analysis/upcoming/next")
async def admin_next_match_analysis(user=Depends(require_admin)):
    """Returns: { match: {...}, report: {...} or None }. Used by dashboard widget."""
    # Cleanup any reports for matches that became finished
    finished_ids = [m.get('id') async for m in db.matches.find({'status': 'finished'}, {'_id': 0, 'id': 1})]
    if finished_ids:
        await db.match_reports.delete_many({'match_id': {'$in': finished_ids}})
    next_m = await db.matches.find_one({'status': 'upcoming'}, {'_id': 0}, sort=[('match_date', 1)])
    if not next_m:
        return {'match': None, 'report': None}
    rep = await db.match_reports.find_one({'match_id': next_m.get('id')}, {'_id': 0})
    return {'match': next_m, 'report': rep}


# ─────────────────────────── Site Settings ───────────────────────────
@api_router.get("/admin/site-settings")
async def admin_get_settings(user=Depends(require_admin)):
    s = await db.site_settings.find_one({'id': 'main'}, {'_id': 0})
    return s or {}

@api_router.put("/admin/site-settings")
async def admin_update_settings(payload: GenericIn, user=Depends(require_admin)):
    data = payload.model_dump()
    # Validate color hex fields (#RRGGBB)
    import re
    hex_re = re.compile(r'^#[0-9a-fA-F]{6}$')
    for fld in ('primary_color', 'secondary_color', 'bg_color'):
        v = data.get(fld)
        if v not in (None, '') and not hex_re.match(v):
            raise HTTPException(400, f"Geçersiz renk: '{fld}' '#RRGGBB' biçiminde olmalı (örn. #f5dc4c)")
    # Validate theme enum
    theme = data.get('default_theme')
    if theme not in (None, '') and theme not in ('dark', 'light'):
        raise HTTPException(400, "default_theme 'dark' veya 'light' olmalı")
    data['id'] = 'main'
    data['updated_at'] = now_iso()
    await db.site_settings.update_one({'id': 'main'}, {'$set': data}, upsert=True)
    s = await db.site_settings.find_one({'id': 'main'}, {'_id': 0})
    return s

@api_router.get("/public/theme.css")
async def public_theme_css():
    """CSS variables reflecting site theme. Public, no auth. Frontend injects this."""
    s = await db.site_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
    primary = s.get('primary_color') or '#f5dc4c'
    secondary = s.get('secondary_color') or '#ffffff'
    bg = s.get('bg_color') or '#0b0b0b'
    theme = s.get('default_theme') or 'dark'
    body_bg = bg if theme == 'dark' else '#ffffff'
    body_fg = '#ffffff' if theme == 'dark' else '#0b0b0b'
    css = f""":root {{
  --liv-primary: {primary};
  --liv-secondary: {secondary};
  --liv-bg: {bg};
  --liv-body-bg: {body_bg};
  --liv-body-fg: {body_fg};
  --liv-theme: "{theme}";
}}
.liv-theme-apply {{
  --tw-gradient-from: {primary};
  --tw-gradient-to: {secondary};
}}
"""
    from fastapi.responses import Response
    return Response(content=css, media_type="text/css", headers={"Cache-Control": "public, max-age=300"})

# ─────────────────────────── AI Settings & Generation ───────────────────────────
@api_router.get("/admin/ai-settings")
async def admin_get_ai_settings(user=Depends(require_super_admin)):
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
async def admin_update_ai_settings(payload: AiSettingsIn, user=Depends(require_super_admin)):
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
import caption_ai

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
    reference_images: Optional[List[str]] = None  # data URLs or /api/public/media/... paths

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
        # If reference images provided, use images.edit (supports up to 3 refs)
        ref_bytes: List[bytes] = []
        for ref in (payload.reference_images or [])[:3]:
            try:
                if ref.startswith('data:image'):
                    _, b64part = ref.split(',', 1)
                    ref_bytes.append(base64.b64decode(b64part))
                elif ref.startswith('/api/public/media/'):
                    storage_path = ref.replace('/api/public/media/', '', 1)
                    data, _ = await object_storage.get_bytes(storage_path)
                    ref_bytes.append(data)
                elif ref.startswith('http'):
                    async with httpx.AsyncClient(timeout=30) as hc:
                        r = await hc.get(ref)
                        r.raise_for_status()
                        ref_bytes.append(r.content)
            except Exception as re:
                logging.warning(f"Skipping bad reference image: {re}")

        if ref_bytes:
            import io
            files = []
            for idx, data in enumerate(ref_bytes):
                bio = io.BytesIO(data); bio.name = f"ref_{idx}.png"
                files.append(bio)
            try:
                resp = await oclient.images.edit(
                    model="gpt-image-2",
                    image=files if len(files) > 1 else files[0],
                    prompt=payload.prompt, size=size, quality=payload.quality, n=1,
                )
                model_used = "gpt-image-2"
            except Exception as e1:
                logging.warning(f"gpt-image-2 edit failed, fallback to gpt-image-1: {e1}")
                files = []
                for idx, data in enumerate(ref_bytes):
                    bio = io.BytesIO(data); bio.name = f"ref_{idx}.png"
                    files.append(bio)
                resp = await oclient.images.edit(
                    model="gpt-image-1",
                    image=files if len(files) > 1 else files[0],
                    prompt=payload.prompt, size=size, quality=payload.quality, n=1,
                )
                model_used = "gpt-image-1"
        else:
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
            await _enforce_media_cap(await _current_media_cap())

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
    """Soft-delete oldest media rows beyond `cap`, PROTECTING manual uploads —
    trim AI-generated items (source in {ai, ai_template}) first; only then uploads."""
    total = await db.media.count_documents({'is_deleted': {'$ne': True}})
    if total <= cap:
        return
    excess = total - cap
    # First pass — AI-generated
    ai_oldest = await db.media.find(
        {'is_deleted': {'$ne': True}, 'source': {'$in': ['ai', 'ai_template']}},
        {'_id': 0, 'id': 1}
    ).sort('created_at', 1).limit(excess).to_list(excess)
    ids = [r['id'] for r in ai_oldest if r.get('id')]
    if ids:
        await db.media.update_many({'id': {'$in': ids}}, {'$set': {'is_deleted': True, 'deleted_at': now_iso(), 'deleted_reason': 'archive_cap'}})
        excess -= len(ids)
    # Second pass — uploads (only if AI pool wasn't enough)
    if excess > 0:
        up_oldest = await db.media.find(
            {'is_deleted': {'$ne': True}},
            {'_id': 0, 'id': 1}
        ).sort('created_at', 1).limit(excess).to_list(excess)
        ids2 = [r['id'] for r in up_oldest if r.get('id')]
        if ids2:
            await db.media.update_many({'id': {'$in': ids2}}, {'$set': {'is_deleted': True, 'deleted_at': now_iso(), 'deleted_reason': 'archive_cap'}})


PLAN_MEDIA_CAP = {'starter': 100, 'plus': 500, 'pro': 2000}

async def _current_media_cap() -> int:
    """Cap based on active subscription plan."""
    try:
        doc = await _ensure_subscription_doc()
        return PLAN_MEDIA_CAP.get(doc.get('plan_name', 'starter'), 500)
    except Exception:
        return 500

async def _resolve_template_ctx(template_key: str, payload: dict) -> dict:
    """Expand ctx with DB lookups: player_id → full player doc; match_id → match doc.
    Auto-derives day_str from any provided date_str/match_date if missing."""
    ctx = dict(payload)
    pid = ctx.pop('player_id', None)
    if pid:
        p = await db.players.find_one({'$or': [{'id': pid}, {'slug': pid}]}, {'_id': 0})
        if p:
            ctx['player'] = p
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
    player_ids = ctx.pop('player_ids', None)
    if player_ids:
        rows = await db.players.find({'id': {'$in': player_ids}}, {'_id': 0}).to_list(20)
        ordered = []
        for pid_ in player_ids:
            found = next((r for r in rows if r.get('id') == pid_), None)
            if found:
                ordered.append(found)
        ctx['players'] = ordered
    # Auto-derive Turkish day name from date_str or match_date if user didn't provide it
    if not ctx.get('day_str'):
        ctx['day_str'] = ai_media._format_day_str(ctx.get('date_str') or ctx.get('match_date') or '')
    return ctx


async def _auto_fill_match_crests(ctx: Dict[str, Any], reference_images: List[str]) -> List[str]:
    """If template uses home_crest/away_crest references and the user didn't upload both,
    auto-resolve from site_settings.logo_url (own club) and opponent_clubs collection.
    User-uploaded refs ALWAYS take priority — auto-fill only fills empty slots."""
    if len(reference_images) >= 2:
        return reference_images  # user provided both — respect override
    home = (ctx.get('home_name') or '').strip()
    away = (ctx.get('away_name') or '').strip()
    if not (home and away):
        return reference_images
    site = await db.site_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
    own_name = (site.get('site_title') or site.get('short_name') or 'Livanespor').strip().lower()
    own_logo = site.get('logo_url')

    async def _crest_for(name: str) -> Optional[str]:
        nl = name.strip().lower()
        if nl == own_name or own_name in nl or nl in own_name:
            return own_logo
        opps = await db.opponent_clubs.find({}, {'_id': 0}).to_list(500)
        # Exact (case-insensitive) match first
        for o in opps:
            on = (o.get('name') or '').strip().lower()
            if on == nl:
                return o.get('crest_url')
        # Fuzzy contains match
        for o in opps:
            on = (o.get('name') or '').strip().lower()
            if on and (on in nl or nl in on):
                return o.get('crest_url')
        return None

    home_crest = await _crest_for(home)
    away_crest = await _crest_for(away)
    auto = []
    if home_crest: auto.append(home_crest)
    if away_crest: auto.append(away_crest)
    # Combine: user refs first (if any), then auto fills only what's missing
    out = list(reference_images)
    while len(out) < 2 and auto:
        out.append(auto.pop(0))
    return out

@api_router.get("/admin/ai/templates")
async def admin_ai_templates(user=Depends(require_admin)):
    return ai_media.list_templates()


class ResolveCrestsIn(BaseModel):
    home_name: str
    away_name: str


@api_router.post("/admin/ai/resolve-crests")
async def admin_ai_resolve_crests(payload: ResolveCrestsIn, user=Depends(require_admin)):
    """Verilen ev sahibi/deplasman adına göre, kulübün kendi logosu (site_settings.logo_url)
    ve opponent_clubs koleksiyonundan rakip logosunu döndürür. Frontend bu URL'leri
    Referans Görseller kutularına önizleme olarak doldurur. Kullanıcı override edebilir."""
    site = await db.site_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
    own_name = (site.get('site_title') or site.get('short_name') or 'Livanespor').strip().lower()
    own_logo = site.get('logo_url')

    async def _crest_for(name: str):
        nl = (name or '').strip().lower()
        if not nl:
            return None, None
        if nl == own_name or own_name in nl or nl in own_name:
            return own_logo, "site_settings"
        opps = await db.opponent_clubs.find({}, {'_id': 0}).to_list(500)
        for o in opps:
            on = (o.get('name') or '').strip().lower()
            if on == nl:
                return o.get('crest_url'), "opponent_clubs"
        for o in opps:
            on = (o.get('name') or '').strip().lower()
            if on and (on in nl or nl in on):
                return o.get('crest_url'), "opponent_clubs"
        return None, None

    h_url, h_src = await _crest_for(payload.home_name)
    a_url, a_src = await _crest_for(payload.away_name)
    return {
        'home_crest_url': h_url,
        'home_source': h_src,  # 'site_settings' | 'opponent_clubs' | None
        'away_crest_url': a_url,
        'away_source': a_src,
    }

@api_router.get("/admin/ai/design-options")
async def admin_ai_design_options(user=Depends(require_admin)):
    """Return available DNA catalog options for the Özelleştir UI."""
    return {
        "layouts": [{"key": k, "label": k.replace("_", " ").title()} for k in ai_media.LAYOUT_RECIPES.keys()],
        "scenes": [{"key": k, "label": k.replace("_", " ").title()} for k in ai_media.SCENE_DESCRIPTIONS.keys()],
        "typographies": [{"key": k, "label": k.replace("_", " ").title()} for k in ai_media.TYPOGRAPHY_DESCRIPTIONS.keys()],
        "drama_levels": [{"value": i, "label": ["", "Minimal", "Dengeli", "Yüksek"][i]} for i in [1, 2, 3]],
    }

class AiTemplateIn(BaseModel):
    template_key: str
    context: Dict[str, Any] = {}
    aspect_ratio: Optional[Literal["1:1", "16:9", "4:5", "9:16"]] = None
    quality: Literal["low", "medium", "high"] = "high"
    title: Optional[str] = None
    # Design customization (DR AI "Özelleştir" toggle)
    custom_design: bool = False
    custom_layout: Optional[str] = None
    custom_typography: Optional[str] = None
    custom_scene: Optional[str] = None
    custom_drama: Optional[int] = None
    custom_show_city: bool = False
    custom_show_year: bool = False
    # Reference images (stored base64 data urls OR storage paths)
    reference_images: List[str] = []  # list of data urls or /api/public/media/... paths
    # Variation count
    variation_count: Literal[1, 3] = 1

async def _run_ai_job(job_id: str):
    """Background worker: coroutine-safe on AsyncIOScheduler."""
    job = await db.ai_media_jobs.find_one({'id': job_id}, {'_id': 0})
    if not job:
        return
    cur = await db.ai_media_jobs.find_one_and_update(
        {'id': job_id, 'status': 'pending'},
        {'$set': {'status': 'processing', 'started_at': now_iso()}},
        return_document=True,
    )
    if not cur:
        return
    try:
        site = await db.site_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
        ctx = await _resolve_template_ctx(cur['template_key'], cur.get('context') or {})
        # Resolve design DNA with variation_index for this sub-job
        variation_index = int(cur.get('variation_index', 0))
        design = ai_media.resolve_design(
            club_id=site.get('short_name') or site.get('site_title') or 'main',
            variation_index=variation_index,
            custom_layout=cur.get('custom_layout') if cur.get('custom_design') else None,
            custom_typography=cur.get('custom_typography') if cur.get('custom_design') else None,
            custom_scene=cur.get('custom_scene') if cur.get('custom_design') else None,
            custom_drama=cur.get('custom_drama') if cur.get('custom_design') else None,
            custom_variation_diverse=True,
            custom_show_city=bool(cur.get('custom_show_city')),
            custom_show_year=bool(cur.get('custom_show_year')),
            city_name=site.get('city') or '',
            founded_year=site.get('founded_year'),
        )
        prompt, default_title = ai_media.build_prompt(cur['template_key'], ctx, site, design)
        tpl = ai_media.TEMPLATES[cur['template_key']]
        aspect = cur.get('aspect_ratio') or tpl['aspect_ratio']
        size = ASPECT_TO_SIZE[aspect]
        ai_settings = await db.ai_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
        api_key = ai_settings.get('openai_api_key') or OPENAI_API_KEY
        if not api_key:
            raise RuntimeError("OpenAI key not configured")
        oclient = AsyncOpenAI(api_key=api_key, timeout=420.0)

        # Reference image handling: fetch bytes from data urls or /api/public/media/... paths
        ref_images_raw: List[str] = cur.get('reference_images') or []
        # Auto-fill missing home/away crests from site_settings + opponent_clubs (only if user gave <2 refs)
        tpl_for_refs = ai_media.TEMPLATES.get(cur['template_key']) or {}
        ref_slots = tpl_for_refs.get('reference_slots') or []
        if 'home_crest' in ref_slots and 'away_crest' in ref_slots:
            ref_images_raw = await _auto_fill_match_crests(ctx, ref_images_raw)
        # Append DR AI Futbol brand logo as the LAST reference image (if enabled)
        # The footer prompt tells the model to use the LAST reference as the center brand logo.
        _, _, brand_logo_url = ai_media._resolve_signature(ctx, site)
        if brand_logo_url:
            ref_images_raw = list(ref_images_raw) + [brand_logo_url]
        ref_bytes: List[bytes] = []
        for ref in ref_images_raw:
            try:
                if ref.startswith('data:image'):
                    _, b64part = ref.split(',', 1)
                    ref_bytes.append(base64.b64decode(b64part))
                elif ref.startswith('/api/public/media/'):
                    storage_path = ref.replace('/api/public/media/', '', 1)
                    data, _ = await object_storage.get_bytes(storage_path)
                    ref_bytes.append(data)
                elif ref.startswith('http'):
                    async with httpx.AsyncClient(timeout=30) as hc:
                        r = await hc.get(ref)
                        r.raise_for_status()
                        ref_bytes.append(r.content)
            except Exception as re:
                logger.warning(f"Skipping bad reference image: {re}")

        model_used = "gpt-image-2"
        if ref_bytes:
            # Use images.edit with reference images
            import io
            files = []
            for idx, data in enumerate(ref_bytes):
                bio = io.BytesIO(data); bio.name = f"ref_{idx}.png"
                files.append(bio)
            try:
                resp = await oclient.images.edit(
                    model="gpt-image-2",
                    image=files if len(files) > 1 else files[0],
                    prompt=prompt, size=size, quality=cur.get('quality', 'high'), n=1,
                )
            except Exception as e1:
                logger.warning(f"gpt-image-2 edit failed, fallback to 1.5: {e1}")
                # Rebuild file handles (BytesIO consumed)
                files = []
                for idx, data in enumerate(ref_bytes):
                    bio = io.BytesIO(data); bio.name = f"ref_{idx}.png"
                    files.append(bio)
                resp = await oclient.images.edit(
                    model="gpt-image-1.5",
                    image=files if len(files) > 1 else files[0],
                    prompt=prompt, size=size, quality=cur.get('quality', 'high'),
                    input_fidelity='high', n=1,
                )
                model_used = "gpt-image-1.5"
        else:
            try:
                resp = await oclient.images.generate(model="gpt-image-2", prompt=prompt, size=size, quality=cur.get('quality', 'high'), n=1)
            except Exception as e1:
                logger.warning(f"gpt-image-2 generate failed, fallback: {e1}")
                resp = await oclient.images.generate(model="gpt-image-1.5", prompt=prompt, size=size, quality=cur.get('quality', 'high'), n=1)
                model_used = "gpt-image-1.5"

        b64 = resp.data[0].b64_json
        if not b64:
            raise RuntimeError("No image returned")
        png = base64.b64decode(b64)
        public_url = None; storage_path = None
        try:
            sp = object_storage.new_path("ai", "png")
            r = await object_storage.put_bytes(sp, png, "image/png")
            storage_path = r.get("path", sp)
            public_url = f"/api/public/media/{storage_path}"
        except Exception as se:
            logger.warning(f"Storage upload failed: {se}")
        media = await _create('media', {
            'title': cur.get('title') or default_title,
            'type': 'image', 'source': 'ai_template',
            'template_key': cur['template_key'],
            'design': {'layout': design['layout_key'], 'scene': design['scene_key'],
                       'typography': design['typography_key'], 'drama': design['drama']},
            'variation_index': variation_index,
            'model': model_used, 'prompt': prompt,
            'aspect_ratio': aspect, 'quality': cur.get('quality', 'high'),
            'storage_path': storage_path, 'public_url': public_url,
            'data_url': None if public_url else f"data:image/png;base64,{b64}",
            'is_deleted': False,
        })
        await _enforce_media_cap(await _current_media_cap())
        await db.ai_media_jobs.update_one({'id': job_id}, {'$set': {
            'status': 'success', 'finished_at': now_iso(),
            'media_id': media['id'], 'public_url': public_url,
            'storage_path': storage_path, 'model': model_used, 'prompt': prompt,
            'design': {'layout': design['layout_key'], 'scene': design['scene_key'],
                       'typography': design['typography_key'], 'drama': design['drama']},
        }})
        # Auto-publish gallery seeds
        if cur.get('auto_publish_to_gallery'):
            await db.ai_media_jobs.update_one({'id': job_id},
                {'$set': {'published_to_gallery': True, 'gallery_published_at': now_iso()}})
            await db.media.update_one({'id': media['id']},
                {'$set': {'published_to_gallery': True, 'gallery_template_key': cur['template_key']}})
        # Generate Instagram caption + hashtags in background (best-effort)
        try:
            social = await caption_ai.generate_social_caption(
                template_key=cur['template_key'], ctx=ctx, site_settings=site,
            )
            if social:
                await db.media.update_one({'id': media['id']}, {'$set': {'social_caption': social}})
                await db.ai_media_jobs.update_one({'id': job_id}, {'$set': {'social_caption': social}})
        except Exception as ce:
            logger.warning(f"Caption generation failed for job {job_id}: {ce}")
    except Exception as e:
        logger.exception(f"AI job {job_id} failed")
        # Refund the 1 credit debited up-front
        try:
            doc = await _ensure_subscription_doc()
            new_bal = int(doc.get('credit_balance', 0)) + 1
            await db.subscriptions.update_one(
                {'id': 'main'},
                {'$set': {'credit_balance': new_bal, 'updated_at': now_iso()},
                 '$push': {'transactions': {
                     'type': 'refund', 'amount': 1, 'balance_after': new_bal,
                     'at': now_iso(), 'note': f"İade: AI job hatası ({job_id[:8]})",
                 }}},
            )
        except Exception as re:
            logger.warning(f"Refund failed: {re}")
        await db.ai_media_jobs.update_one({'id': job_id}, {'$set': {
            'status': 'error', 'finished_at': now_iso(),
            'error': str(e)[:500], 'refunded': True,
        }})

@api_router.post("/admin/ai/generate-template")
async def admin_ai_generate_template(payload: AiTemplateIn, user=Depends(require_admin)):
    if payload.template_key not in ai_media.TEMPLATES:
        raise HTTPException(400, "Geçersiz şablon anahtarı")
    n = int(payload.variation_count or 1)
    # ATOMIC pre-check: ensure balance >= n before deducting anything.
    sub = await _ensure_subscription_doc()
    if int(sub.get('credit_balance', 0)) < n:
        raise HTTPException(402, f"Kredi yetersiz: {n} kredi gerekli, bakiye {sub.get('credit_balance', 0)}. PAKETİM ekranından paketinizi yükseltin.")
    # Now deduct n credits (one tx per variation for visibility)
    for _ in range(n):
        await consume_credit(1, note=f"AI template: {payload.template_key}")
    batch_id = new_id()
    jobs = []
    base_doc = {
        'batch_id': batch_id,
        'status': 'pending',
        'template_key': payload.template_key,
        'context': payload.context,
        'aspect_ratio': payload.aspect_ratio,
        'quality': payload.quality,
        'title': payload.title,
        'custom_design': payload.custom_design,
        'custom_layout': payload.custom_layout,
        'custom_typography': payload.custom_typography,
        'custom_scene': payload.custom_scene,
        'custom_drama': payload.custom_drama,
        'custom_show_city': payload.custom_show_city,
        'custom_show_year': payload.custom_show_year,
        'reference_images': payload.reference_images,
        'created_by': user.get('id'),
        'created_at': now_iso(),
    }
    for idx in range(n):
        job = dict(base_doc)
        job['id'] = new_id()
        job['variation_index'] = idx
        await db.ai_media_jobs.insert_one(dict(job))
        job.pop('_id', None)
        jobs.append(job)
        try:
            mackolik_scheduler.schedule_once(lambda jid=job['id']: _run_ai_job(jid))
        except Exception:
            asyncio.create_task(_run_ai_job(job['id']))
    return {'batch_id': batch_id, 'jobs': jobs, 'variation_count': n}

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

# ─────────────────────────── Stale Job Recovery ───────────────────────────
async def recover_stale_jobs():
    """Find jobs stuck in 'processing' >5min OR 'pending' >10min — mark error + refund 1 credit each.
    Runs at boot and periodically (every 3 minutes via APScheduler)."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    proc_cutoff = (now - timedelta(minutes=5)).isoformat()
    pend_cutoff = (now - timedelta(minutes=10)).isoformat()
    stale = await db.ai_media_jobs.find({
        '$or': [
            {'status': 'processing', 'started_at': {'$lt': proc_cutoff}},
            {'status': 'pending', 'created_at': {'$lt': pend_cutoff}},
        ]
    }, {'_id': 0}).to_list(50)
    if not stale:
        return 0
    for j in stale:
        try:
            # Refund 1 credit per stuck job
            doc = await _ensure_subscription_doc()
            new_bal = int(doc.get('credit_balance', 0)) + 1
            await db.subscriptions.update_one({'id': 'main'},
                {'$set': {'credit_balance': new_bal, 'updated_at': now_iso()},
                 '$push': {'transactions': {
                     'type': 'refund', 'amount': 1, 'balance_after': new_bal,
                     'at': now_iso(),
                     'note': f"İade: takılan iş otomatik kurtarıldı ({j['id'][:8]})",
                 }}})
            await db.ai_media_jobs.update_one({'id': j['id']}, {'$set': {
                'status': 'error',
                'error': 'Job timed out (auto-recovered, 1 kredi iade edildi)',
                'finished_at': now_iso(),
                'refunded': True,
                'auto_recovered': True,
            }})
            logger.info(f"Recovered stale job {j['id'][:8]} ({j.get('status')})")
        except Exception as e:
            logger.warning(f"Failed to recover {j['id']}: {e}")
    return len(stale)

@api_router.post("/admin/ai/jobs/recover-stale")
async def admin_recover_stale_jobs(user=Depends(require_admin)):
    """Manual trigger for stale-job recovery (admin can force-run any time)."""
    n = await recover_stale_jobs()
    return {'ok': True, 'recovered': n}

# ─────────────────────────── Gallery (Phase 2.1) ───────────────────────────
class GalleryPublishIn(BaseModel):
    job_id: str
    note: Optional[str] = None  # internal

@api_router.post("/admin/ai/gallery/publish")
async def admin_ai_gallery_publish(payload: GalleryPublishIn, user=Depends(require_admin)):
    """Opt-in: kullanıcı bir AI görselini örnek galeriye ekler.
    Galeride kulüp adı/logosu gösterilmez — sadece estetik referans."""
    j = await db.ai_media_jobs.find_one({'id': payload.job_id}, {'_id': 0})
    if not j or j.get('status') != 'success' or not j.get('media_id'):
        raise HTTPException(400, "Sadece başarılı işler galeriye eklenebilir")
    await db.ai_media_jobs.update_one({'id': payload.job_id},
        {'$set': {'published_to_gallery': True, 'gallery_published_at': now_iso()}})
    await db.media.update_one({'id': j['media_id']},
        {'$set': {'published_to_gallery': True, 'gallery_template_key': j.get('template_key')}})
    return {'ok': True}

@api_router.post("/admin/ai/gallery/unpublish")
async def admin_ai_gallery_unpublish(payload: GalleryPublishIn, user=Depends(require_admin)):
    j = await db.ai_media_jobs.find_one({'id': payload.job_id}, {'_id': 0})
    if not j:
        raise HTTPException(404, "İş bulunamadı")
    await db.ai_media_jobs.update_one({'id': payload.job_id}, {'$set': {'published_to_gallery': False}})
    if j.get('media_id'):
        await db.media.update_one({'id': j['media_id']}, {'$set': {'published_to_gallery': False}})
    return {'ok': True}

@api_router.get("/public/ai/gallery")
async def public_ai_gallery(template_key: Optional[str] = None, limit: int = 12):
    """No-auth gallery — anonymized examples per template, sorted newest first."""
    q: Dict[str, Any] = {'published_to_gallery': True, 'is_deleted': {'$ne': True}, 'public_url': {'$ne': None}}
    if template_key:
        q['gallery_template_key'] = template_key
    rows = await db.media.find(q, {'_id': 0}).sort('created_at', -1).limit(min(limit, 50)).to_list(min(limit, 50))
    # Strip club-identifying fields
    return [{
        'id': r['id'],
        'public_url': r.get('public_url'),
        'template_key': r.get('gallery_template_key') or r.get('template_key'),
        'design': r.get('design'),
        'aspect_ratio': r.get('aspect_ratio'),
    } for r in rows]

class GallerySeedIn(BaseModel):
    template_key: str
    count: int = 3  # how many variations to generate
    quality: Literal["low", "medium", "high"] = "high"

@api_router.post("/admin/ai/gallery/seed")
async def admin_ai_gallery_seed(payload: GallerySeedIn, user=Depends(require_admin)):
    """Süper admin only: bir şablon için galeri seed örnekleri üret.
    HIGH quality gpt-image-2 ile çoklu DNA varyasyonu — her seed = 1 kredi."""
    if user.get('role') != 'super_admin':
        raise HTTPException(403, "Sadece süper admin galeriye seed ekleyebilir")
    if payload.template_key not in ai_media.TEMPLATES:
        raise HTTPException(400, "Geçersiz şablon")
    n = max(1, min(payload.count, 6))
    sub = await _ensure_subscription_doc()
    if int(sub.get('credit_balance', 0)) < n:
        raise HTTPException(402, f"Kredi yetersiz: {n} kredi gerekli, bakiye {sub.get('credit_balance', 0)}")
    for _ in range(n):
        await consume_credit(1, note=f"Gallery seed: {payload.template_key}")
    # Sample context per template — generic placeholder data so visuals are universal
    sample_ctx = {
        'match_week':   {'home_name': 'TEAM A', 'away_name': 'TEAM B', 'date_str': '15.06.2026', 'time_str': '19:00', 'stadium': 'CITY STADIUM', 'league_display': 'PRO LEAGUE'},
        'match_day':    {'home_name': 'TEAM A', 'away_name': 'TEAM B', 'date_str': '15.06.2026', 'time_str': '19:00', 'stadium': 'CITY STADIUM', 'league_display': 'PRO LEAGUE'},
        'lineup':       {'players': [{'name': f'PLAYER {i+1}', 'jersey_number': i+1, 'position': ['GK','DEF','MID','FW'][i % 4]} for i in range(11)], 'formation': '4-3-3', 'home_name': 'OUR CLUB', 'away_name': 'RIVAL'},
        'full_time':    {'home_name': 'TEAM A', 'away_name': 'TEAM B', 'home_score': 3, 'away_score': 1, 'date_str': '15.06.2026', 'stadium': 'CITY STADIUM', 'league_display': 'PRO LEAGUE'},
        'motm':         {'player': {'name': 'STAR PLAYER', 'jersey_number': 10, 'position': 'FORWARD'}, 'subtitle': 'WEEK 12', 'match_context': 'TEAM A 3-1 TEAM B'},
        'birthday':     {'person': {'name': 'PLAYER NAME', 'jersey_number': 7, 'position': 'MIDFIELDER'}, 'turning_age': 25},
        'special_day':  {'title': '23 NİSAN', 'body_text': 'Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun.', 'occasion_hint': 'resmi bayram'},
        'new_transfer': {'player': {'name': 'NEW SIGNING', 'jersey_number': 9, 'position': 'STRIKER'}, 'from_club': 'PREVIOUS FC'},
        'fan_invite':   {'match_text': 'SATURDAY 19:00 HOME', 'message': 'TRİBÜNLERE BEKLİYORUZ!'},
    }.get(payload.template_key, {})
    batch_id = new_id()
    jobs = []
    for idx in range(n):
        job = {
            'id': new_id(),
            'batch_id': batch_id,
            'status': 'pending',
            'template_key': payload.template_key,
            'context': sample_ctx,
            'aspect_ratio': None,
            'quality': payload.quality,
            'title': f"Gallery seed — {payload.template_key} V{idx+1}",
            'custom_design': False,
            'reference_images': [],
            'variation_index': idx,  # diverse DNA per index
            'is_gallery_seed': True,
            'auto_publish_to_gallery': True,  # auto-publish on success
            'created_by': user.get('id'),
            'created_at': now_iso(),
        }
        await db.ai_media_jobs.insert_one(dict(job))
        job.pop('_id', None); jobs.append(job)
        try:
            mackolik_scheduler.schedule_once(lambda jid=job['id']: _run_ai_job(jid))
        except Exception:
            asyncio.create_task(_run_ai_job(job['id']))
    return {'batch_id': batch_id, 'jobs': jobs, 'count': n}


class GalleryImportIn(BaseModel):
    source_url: str  # e.g. https://club-dashboard-pro-2.preview.emergentagent.com
    template_keys: Optional[List[str]] = None  # if None → all 9
    per_template: int = 6  # max items per template


@api_router.post("/admin/ai/gallery/import-from-source")
async def admin_gallery_import_from_source(payload: GalleryImportIn, user=Depends(require_admin)):
    """Süper admin only: fetches the public gallery from another deployment
    (e.g. preview) and copies the images + metadata into THIS deployment's
    storage + DB. FREE — no AI credits consumed, since images already exist.
    Idempotent: skips items already imported from same source_url.
    """
    if user.get('role') != 'super_admin':
        raise HTTPException(403, "Sadece süper admin galeriye dış kaynaktan içe aktarabilir")
    src = payload.source_url.rstrip('/')
    if not src.startswith(('http://', 'https://')):
        raise HTTPException(400, "Geçersiz kaynak URL")
    template_keys = payload.template_keys or list(ai_media.TEMPLATES.keys())
    per_template = max(1, min(payload.per_template, 12))
    summary: Dict[str, Any] = {'imported': 0, 'skipped': 0, 'failed': 0, 'per_template': {}}
    async with httpx.AsyncClient(timeout=60) as client:
        for tk in template_keys:
            tk_imported = 0; tk_skipped = 0; tk_failed = 0
            try:
                r = await client.get(f"{src}/api/public/ai/gallery", params={'template_key': tk, 'limit': per_template})
                if r.status_code != 200:
                    summary['per_template'][tk] = {'imported': 0, 'skipped': 0, 'failed': per_template, 'error': f'HTTP {r.status_code}'}
                    summary['failed'] += per_template
                    continue
                items = r.json()
            except Exception as e:
                summary['per_template'][tk] = {'imported': 0, 'skipped': 0, 'failed': per_template, 'error': str(e)[:120]}
                summary['failed'] += per_template
                continue
            for item in items:
                try:
                    src_id = item.get('id')
                    if src_id and await db.media.find_one({'imported_source_id': src_id}, {'_id': 1}):
                        tk_skipped += 1; continue
                    img_url = f"{src}{item.get('public_url')}" if (item.get('public_url') or '').startswith('/') else item.get('public_url')
                    if not img_url:
                        tk_failed += 1; continue
                    rr = await client.get(img_url)
                    if rr.status_code != 200 or not rr.content:
                        tk_failed += 1; continue
                    storage_path = object_storage.new_path(f"gallery/{tk}", ext="png")
                    await object_storage.put_bytes(storage_path, rr.content, content_type="image/png")
                    public_url = f"/api/public/media/{storage_path}"
                    media_doc = {
                        'id': new_id(),
                        'title': f"Gallery seed (imported) — {tk}",
                        'type': 'image',
                        'purpose': 'gallery',
                        'source': 'ai_template',
                        'storage_path': storage_path,
                        'public_url': public_url,
                        'template_key': tk,
                        'gallery_template_key': tk,
                        'design': item.get('design'),
                        'aspect_ratio': item.get('aspect_ratio'),
                        'published_to_gallery': True,
                        'is_gallery_seed': True,
                        'is_deleted': False,
                        'imported_source_url': src,
                        'imported_source_id': src_id,
                        'created_at': now_iso(),
                    }
                    await db.media.insert_one(media_doc)
                    tk_imported += 1
                except Exception as e:
                    logger.warning(f"gallery import failed for {tk}/{src_id}: {e}")
                    tk_failed += 1
            summary['per_template'][tk] = {'imported': tk_imported, 'skipped': tk_skipped, 'failed': tk_failed}
            summary['imported'] += tk_imported
            summary['skipped'] += tk_skipped
            summary['failed'] += tk_failed
    return summary


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

# Media library — base64 upload, persisted to Object Storage with public URL
class MediaUploadIn(BaseModel):
    title: str
    data_url: str  # data:image/...;base64,...
    type: str = "image"
    purpose: Optional[str] = "upload"  # 'upload' | 'team_photo' | 'logo' | etc.

@api_router.post("/admin/media/upload")
async def admin_media_upload(payload: MediaUploadIn, user=Depends(require_admin)):
    """Persist a base64 data-URL image to Object Storage and return a public_url.
    Falls back to keeping data_url in DB if storage fails."""
    public_url = None
    storage_path = None
    try:
        if not payload.data_url.startswith("data:image"):
            raise ValueError("data_url must be a data:image/* URL")
        header, b64 = payload.data_url.split(",", 1)
        # Detect extension from MIME
        ext = "png"
        if "image/jpeg" in header or "image/jpg" in header: ext = "jpg"
        elif "image/webp" in header: ext = "webp"
        png = base64.b64decode(b64)
        sp = object_storage.new_path(payload.purpose or "upload", ext)
        r = await object_storage.put_bytes(sp, png, header.split(";")[0].replace("data:", "") or "image/png")
        storage_path = r.get("path", sp)
        public_url = f"/api/public/media/{storage_path}"
    except Exception as e:
        logger.warning(f"Storage upload (manual) failed, keeping base64: {e}")

    media = await _create('media', {
        'title': payload.title,
        'type': payload.type,
        'source': 'upload',
        'storage_path': storage_path,
        'public_url': public_url,
        'data_url': None if public_url else payload.data_url,
        'is_deleted': False,
    })
    await _enforce_media_cap(await _current_media_cap())
    return {**media, 'public_url': public_url, 'storage_path': storage_path}

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
    """Get or create the default subscription doc (id=main, club_id=main).
    The club_id field is foundation for multi-tenant rollout (currently singleton).
    Auto-resets monthly credits.
    """
    doc = await db.subscriptions.find_one({'id': 'main'}, {'_id': 0})
    now_ym = _current_year_month()
    if not doc:
        defaults = PLAN_LIMITS['starter']
        doc = {
            'id': 'main',
            'club_id': 'main',
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
    # Backfill club_id if missing on legacy docs
    if not doc.get('club_id'):
        await db.subscriptions.update_one({'id': 'main'}, {'$set': {'club_id': 'main'}})
        doc['club_id'] = 'main'
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
async def admin_set_subscription_plan(payload: SubscriptionPlanIn, user=Depends(require_super_admin)):
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
async def admin_credit_adjust(payload: CreditAdjustIn, user=Depends(require_super_admin)):
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
# Routes live in dashboard_routes.py — registered just before app.include_router below.
from dashboard_routes import register_dashboard_routes
register_dashboard_routes(api_router, db, require_admin, _ensure_subscription_doc)

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

from seeds import seed_admin as _seed_admin, seed_content as _seed_content

@app.on_event("startup")
async def startup_event():
    await _seed_admin(db, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_NAME)
    await _seed_content(db)
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
    # Stale job recovery — boot + periodic every 3 min
    try:
        n = await recover_stale_jobs()
        if n: logger.info(f"Boot stale recovery: {n} jobs cleaned")
    except Exception as e:
        logger.warning(f"Stale recovery boot failed: {e}")
    try:
        from apscheduler.triggers.interval import IntervalTrigger
        if mackolik_scheduler._scheduler:
            mackolik_scheduler._scheduler.add_job(
                lambda: asyncio.run_coroutine_threadsafe(recover_stale_jobs(), asyncio.get_event_loop()),
                IntervalTrigger(minutes=3), id='stale_recovery', replace_existing=True,
            )
    except Exception as e:
        logger.warning(f"Stale recovery cron setup failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

