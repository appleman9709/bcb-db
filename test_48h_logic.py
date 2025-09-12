#!/usr/bin/env python3
"""
Тест логики 48 часов
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

def test_48h_logic():
    """Тестирует логику 48 часов"""
    try:
        print("🔍 Тестирование логики 48 часов...")
        
        # Подключаемся к локальной базе
        conn = sqlite3.connect("babybot.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        family_id = 1
        
        # Логика 48 часов
        current_time = get_thai_time()
        start_date = (current_time - timedelta(hours=48)).isoformat()
        end_date = current_time.isoformat()
        
        print(f"📅 Период: {start_date} - {end_date}")
        print(f"🕐 Текущее время: {current_time.isoformat()}")
        
        # Проверяем статистику за последние 48 часов
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM feedings 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        feedings_48h = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM diapers 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        diapers_48h = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM activities 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        activities_48h = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM baths 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        baths_48h = cur.fetchone()['count']
        
        print(f"📈 Статистика за последние 48 часов:")
        print(f"   • Кормления: {feedings_48h}")
        print(f"   • Подгузники: {diapers_48h}")
        print(f"   • Активности: {activities_48h}")
        print(f"   • Купания: {baths_48h}")
        
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
        
        # Проверяем, попадают ли события в период 48 часов
        if last_feeding:
            feeding_dt = datetime.fromisoformat(last_feeding['timestamp'].replace('Z', '+00:00'))
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if feeding_dt >= start_dt:
                print("✅ Последнее кормление попадает в период 48 часов")
            else:
                print("❌ Последнее кормление НЕ попадает в период 48 часов")
        
        if last_diaper:
            diaper_dt = datetime.fromisoformat(last_diaper['timestamp'].replace('Z', '+00:00'))
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if diaper_dt >= start_dt:
                print("✅ Последний подгузник попадает в период 48 часов")
            else:
                print("❌ Последний подгузник НЕ попадает в период 48 часов")
        
        conn.close()
        
        if feedings_48h > 0 or diapers_48h > 0:
            print("✅ Логика 48 часов работает - данные найдены!")
            return True
        else:
            print("⚠️ Логика 48 часов не помогла - данных все еще нет")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        return False

if __name__ == "__main__":
    test_48h_logic()
