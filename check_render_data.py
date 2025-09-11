#!/usr/bin/env python3
"""
Проверка данных на Render
"""
import requests
import json
from datetime import datetime, timedelta
import pytz

def get_thai_time():
    """Получить текущее время в тайском часовом поясе"""
    thai_tz = pytz.timezone('Asia/Bangkok')
    utc_now = datetime.now(pytz.UTC)
    thai_now = utc_now.astimezone(thai_tz)
    return thai_now

def check_render_data():
    """Проверяет данные на Render"""
    try:
        print("🔍 Проверка данных на Render...")
        
        api_url = "https://babycarebot-api.onrender.com/api"
        
        # Проверяем здоровье API
        print("1. Проверка здоровья API...")
        health_response = requests.get(f"{api_url}/health", timeout=10)
        if health_response.status_code == 200:
            print("✅ API работает")
        else:
            print(f"❌ API недоступен: {health_response.status_code}")
            return False
        
        # Получаем список семей
        print("2. Получение списка семей...")
        families_response = requests.get(f"{api_url}/families", timeout=10)
        if families_response.status_code == 200:
            families = families_response.json()
            print(f"✅ Найдено семей: {len(families.get('families', []))}")
            for family in families.get('families', []):
                print(f"   • ID: {family['id']}, Название: {family['name']}")
        else:
            print(f"❌ Ошибка получения семей: {families_response.status_code}")
            return False
        
        if not families.get('families'):
            print("❌ Нет семей в базе данных")
            return False
        
        family_id = families['families'][0]['id']
        
        # Проверяем дашборд для разных периодов
        print(f"3. Проверка дашборда для семьи {family_id}...")
        
        periods = ['today', 'week', 'month']
        for period in periods:
            print(f"   Период: {period}")
            dashboard_response = requests.get(f"{api_url}/family/{family_id}/dashboard?period={period}", timeout=10)
            if dashboard_response.status_code == 200:
                dashboard_data = dashboard_response.json()
                stats = dashboard_data.get('today_stats', {})
                print(f"     • Кормления: {stats.get('feedings', 0)}")
                print(f"     • Подгузники: {stats.get('diapers', 0)}")
                print(f"     • Активности: {stats.get('activities', 0)}")
                print(f"     • Купания: {stats.get('baths', 0)}")
                
                # Проверяем последние события
                last_events = dashboard_data.get('last_events', {})
                print(f"     • Последнее кормление: {last_events.get('feeding', {}).get('timestamp', 'Нет данных')}")
                print(f"     • Последний подгузник: {last_events.get('diaper', {}).get('timestamp', 'Нет данных')}")
            else:
                print(f"     ❌ Ошибка получения дашборда: {dashboard_response.status_code}")
        
        # Проверяем историю
        print("4. Проверка истории...")
        history_response = requests.get(f"{api_url}/family/{family_id}/history?days=7", timeout=10)
        if history_response.status_code == 200:
            history_data = history_response.json()
            history = history_data.get('history', [])
            print(f"✅ Получена история за {len(history)} дней")
            
            # Показываем последние 3 дня
            for i, day in enumerate(history[:3]):
                print(f"   {day.get('date', 'Неизвестно')}: кормления={day.get('feedings', 0)}, подгузники={day.get('diapers', 0)}")
        else:
            print(f"❌ Ошибка получения истории: {history_response.status_code}")
        
        print("✅ Проверка завершена")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при проверке: {e}")
        return False

if __name__ == "__main__":
    check_render_data()
