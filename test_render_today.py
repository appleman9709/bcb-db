#!/usr/bin/env python3
"""
Тест периода "today" на Render
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

def test_render_today():
    """Тестирует период today на Render"""
    try:
        print("🔍 Тестирование периода 'today' на Render...")
        
        api_url = "https://babycarebot-api.onrender.com/api"
        
        # Получаем дашборд для периода today
        response = requests.get(f"{api_url}/family/1/dashboard?period=today", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            print("✅ Данные получены успешно")
            print(f"📊 Статистика: {data.get('today_stats', {})}")
            
            # Проверяем, есть ли отладочная информация в логах
            print("🔍 Проверяем логи Render...")
            
            # Попробуем получить данные с отладочной информацией
            debug_response = requests.get(f"{api_url}/family/1/dashboard?period=today&debug=1", timeout=10)
            if debug_response.status_code == 200:
                print("✅ Отладочная информация доступна")
            else:
                print("⚠️ Отладочная информация недоступна")
            
            return True
        else:
            print(f"❌ Ошибка получения данных: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        return False

if __name__ == "__main__":
    test_render_today()
