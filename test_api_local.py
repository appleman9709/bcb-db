#!/usr/bin/env python3
"""
Тест локального API с новой логикой
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

def test_new_logic():
    """Тестирует новую логику с последними 24 часами"""
    try:
        print("🔍 Тестирование новой логики (последние 24 часа)...")
        
        # Подключаемся к локальной базе
        conn = sqlite3.connect("babybot.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        family_id = 1
        
        # Новая логика: последние 24 часа
        current_time = get_thai_time()
        start_date = (current_time - timedelta(hours=24)).isoformat()
        end_date = current_time.isoformat()
        
        print(f"📅 Период: {start_date} - {end_date}")
        print(f"🕐 Текущее время: {current_time.isoformat()}")
        
        # Проверяем статистику за последние 24 часа
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM feedings 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        feedings_24h = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM diapers 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        diapers_24h = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM activities 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        activities_24h = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM baths 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        baths_24h = cur.fetchone()['count']
        
        print(f"📈 Статистика за последние 24 часа:")
        print(f"   • Кормления: {feedings_24h}")
        print(f"   • Подгузники: {diapers_24h}")
        print(f"   • Активности: {activities_24h}")
        print(f"   • Купания: {baths_24h}")
        
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
        
        if feedings_24h > 0 or diapers_24h > 0:
            print("✅ Новая логика работает - данные найдены!")
            return True
        else:
            print("⚠️ Новая логика не помогла - данных все еще нет")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        return False

if __name__ == "__main__":
    test_new_logic()
