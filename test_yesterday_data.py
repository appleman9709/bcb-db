#!/usr/bin/env python3
"""
Тест данных за вчера
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

def test_yesterday_data():
    """Тестирует данные за вчера"""
    try:
        print("🔍 Тестирование данных за вчера...")
        
        # Подключаемся к локальной базе
        conn = sqlite3.connect("babybot.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        family_id = 1
        yesterday = get_thai_date() - timedelta(days=1)
        start_date = datetime.combine(yesterday, datetime.min.time()).isoformat()
        end_date = datetime.combine(yesterday, datetime.max.time()).isoformat()
        
        print(f"📅 Проверяем данные за {yesterday}")
        print(f"   Период: {start_date} - {end_date}")
        
        # Проверяем статистику за вчера
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM feedings 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        yesterday_feedings = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM diapers 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        yesterday_diapers = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM activities 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        yesterday_activities = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM baths 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        yesterday_baths = cur.fetchone()['count']
        
        print(f"📈 Статистика за вчера:")
        print(f"   • Кормления: {yesterday_feedings}")
        print(f"   • Подгузники: {yesterday_diapers}")
        print(f"   • Активности: {yesterday_activities}")
        print(f"   • Купания: {yesterday_baths}")
        
        # Проверяем общую статистику
        cur.execute("SELECT COUNT(*) FROM feedings WHERE family_id = ?", (family_id,))
        total_feedings = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM diapers WHERE family_id = ?", (family_id,))
        total_diapers = cur.fetchone()[0]
        
        print(f"📊 Общая статистика:")
        print(f"   • Всего кормлений: {total_feedings}")
        print(f"   • Всего подгузников: {total_diapers}")
        
        # Проверяем последние события
        cur.execute("""
            SELECT timestamp, author_role, author_name 
            FROM feedings 
            WHERE family_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 5
        """, (family_id,))
        last_feedings = cur.fetchall()
        
        print(f"🕐 Последние 5 кормлений:")
        for feeding in last_feedings:
            print(f"   • {feeding['timestamp']} - {feeding['author_role']} {feeding['author_name']}")
        
        conn.close()
        
        return True
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        return False

if __name__ == "__main__":
    test_yesterday_data()
