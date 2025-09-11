#!/usr/bin/env python3
"""
Тест локального API для проверки данных
"""
import sqlite3
import json
from datetime import datetime, timedelta
import pytz

def get_thai_time():
    """Получить текущее время в тайском часовом поясе"""
    thai_tz = pytz.timezone('Asia/Bangkok')
    utc_now = datetime.now(pytz.UTC)
    thai_now = utc_now.astimezone(thai_tz)
    return thai_now

def get_thai_date():
    """Получить текущую дату в тайском часовом поясе"""
    return get_thai_time().date()

def test_local_database():
    """Тестирует локальную базу данных"""
    try:
        print("🔍 Тестирование локальной базы данных...")
        
        # Подключаемся к локальной базе
        conn = sqlite3.connect("babybot.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Проверяем семьи
        cur.execute("SELECT id, name FROM families")
        families = cur.fetchall()
        print(f"👨‍👩‍👧‍👦 Семьи: {len(families)}")
        for family in families:
            print(f"   • ID: {family['id']}, Название: {family['name']}")
        
        if not families:
            print("❌ Нет семей в базе данных!")
            return False
        
        family_id = families[0]['id']
        print(f"📊 Тестируем семью {family_id}...")
        
        # Проверяем статистику
        today = get_thai_date()
        start_date = datetime.combine(today, datetime.min.time()).isoformat()
        end_date = datetime.combine(today, datetime.max.time()).isoformat()
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM feedings 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        today_feedings = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM diapers 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        today_diapers = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM activities 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        today_activities = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM baths 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        today_baths = cur.fetchone()['count']
        
        print(f"📈 Статистика за сегодня:")
        print(f"   • Кормления: {today_feedings}")
        print(f"   • Подгузники: {today_diapers}")
        print(f"   • Активности: {today_activities}")
        print(f"   • Купания: {today_baths}")
        
        # Проверяем последние события
        cur.execute("""
            SELECT timestamp, author_role, author_name 
            FROM feedings 
            WHERE family_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (family_id,))
        last_feeding = cur.fetchone()
        
        cur.execute("""
            SELECT timestamp, author_role, author_name 
            FROM diapers 
            WHERE family_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (family_id,))
        last_diaper = cur.fetchone()
        
        print(f"🕐 Последние события:")
        print(f"   • Кормление: {last_feeding['timestamp'] if last_feeding else 'Нет данных'}")
        print(f"   • Подгузник: {last_diaper['timestamp'] if last_diaper else 'Нет данных'}")
        
        conn.close()
        
        if today_feedings > 0 or today_diapers > 0:
            print("✅ Локальная база данных содержит данные")
            return True
        else:
            print("⚠️ В локальной базе нет данных за сегодня")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании БД: {e}")
        return False

if __name__ == "__main__":
    test_local_database()
