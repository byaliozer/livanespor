"""Seed demo attendance data to validate the full flow."""
import asyncio, uuid, random
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
import motor.motor_asyncio as m
import os

async def go():
    db = m.AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    players = await db.players.find({'active': {'$ne': False}}, {'_id': 0}).to_list(500)
    if len(players) < 10:
        print(f'Only {len(players)} players. Aborting.')
        return
    print(f'Total players: {len(players)}')

    today = datetime.now(timezone.utc).date()
    training_dates = [today - timedelta(days=d) for d in (22, 18, 15, 11, 8, 4, 1)]

    champions = players[:4]
    no_shows = players[-3:]

    REASONS_NORMAL = ['Hastalık', 'İş', 'Aile durumu', 'Trafik', 'Habersiz']
    REASONS_NOSHOW = ['Habersiz', 'Trafik', 'Habersiz', 'Mazeretsiz', 'Habersiz']

    now = datetime.now(timezone.utc).isoformat()
    new_trainings, new_attendances = [], []

    random.seed(42)
    for d in training_dates:
        tid = str(uuid.uuid4())
        new_trainings.append({
            'id': tid, 'group_label': 'A Takım', 'date': d.isoformat(),
            'time_range': '20:00-21:30', 'field': 'Yolçatı Saha 1',
            'coach_name': 'Hakan Türker', 'notes': 'A Takım antrenmanı',
            'attendance_taken': True, 'attendance_at': now,
            'created_at': now, 'updated_at': now,
        })
        for p in players:
            if p in champions:
                status, reason = 'present', None
            elif p in no_shows:
                if random.random() < 0.85:
                    status, reason = 'absent', random.choice(REASONS_NOSHOW)
                else:
                    status, reason = 'present', None
            else:
                if random.random() < 0.75:
                    status, reason = 'present', None
                else:
                    status, reason = 'absent', random.choice(REASONS_NORMAL)
            new_attendances.append({
                'id': str(uuid.uuid4()), 'training_id': tid,
                'training_group': 'A Takım', 'training_date': d.isoformat(),
                'training_time': '20:00-21:30', 'player_id': p['id'],
                'player_name': p.get('name'), 'player_jersey': p.get('jersey_number'),
                'player_position': p.get('position'), 'player_photo': p.get('photo_url'),
                'status': status, 'reason': reason,
                'recorded_by': 'demo-seeder', 'recorded_at': now,
            })

    await db.team_trainings.insert_many(new_trainings)
    await db.attendance_records.insert_many(new_attendances)
    print(f'✓ Inserted {len(new_trainings)} trainings, {len(new_attendances)} attendance records')
    print('\nÖzet:')
    print('  Şampiyonlar (beklenen %100):', [c["name"] for c in champions])
    print('  En çok gelmeyenler (beklenen):', [n["name"] for n in no_shows])

asyncio.run(go())
