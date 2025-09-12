#!/usr/bin/env python3
"""
Отладка логики Render - проверяем, какая логика работает
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

def debug_render_logic():
    """Отлаживает логику Render"""
    try:
        print("🔍 Отладка логики Render...")
        
        api_url = "https://babycarebot-api.onrender.com/api"
        
        # Получаем текущее время
        current_time = get_thai_time()
        print(f"🕐 Текущее время (тайское): {current_time.isoformat()}")
        
        # Вычисляем период для "последние 24 часа"
        start_24h = (current_time - timedelta(hours=24)).isoformat()
        end_24h = current_time.isoformat()
        
        print(f"📅 Период последних 24 часов:")
        print(f"   Начало: {start_24h}")
        print(f"   Конец: {end_24h}")
        
        # Проверяем, что возвращает API для периода today
        print("\n🔍 Проверка API для периода 'today'...")
        response = requests.get(f"{api_url}/family/1/dashboard?period=today", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get('today_stats', {})
            
            print(f"📊 Статистика от API:")
            print(f"   • Кормления: {stats.get('feedings', 0)}")
            print(f"   • Подгузники: {stats.get('diapers', 0)}")
            print(f"   • Активности: {stats.get('activities', 0)}")
            print(f"   • Купания: {stats.get('baths', 0)}")
            
            # Проверяем последние события
            last_events = data.get('last_events', {})
            feeding_time = last_events.get('feeding', {}).get('timestamp')
            diaper_time = last_events.get('diaper', {}).get('timestamp')
            
            print(f"\n🕐 Последние события:")
            print(f"   • Кормление: {feeding_time}")
            print(f"   • Подгузник: {diaper_time}")
            
            # Проверяем, попадают ли последние события в период 24 часов
            if feeding_time:
                feeding_dt = datetime.fromisoformat(feeding_time.replace('Z', '+00:00'))
                if feeding_dt >= datetime.fromisoformat(start_24h.replace('Z', '+00:00')):
                    print("✅ Последнее кормление попадает в период 24 часов")
                else:
                    print("❌ Последнее кормление НЕ попадает в период 24 часов")
            
            if diaper_time:
                diaper_dt = datetime.fromisoformat(diaper_time.replace('Z', '+00:00'))
                if diaper_dt >= datetime.fromisoformat(start_24h.replace('Z', '+00:00')):
                    print("✅ Последний подгузник попадает в период 24 часов")
                else:
                    print("❌ Последний подгузник НЕ попадает в период 24 часов")
            
            # Вывод: если события не попадают в 24 часа, значит код не обновился
            if stats.get('feedings', 0) == 0 and stats.get('diapers', 0) == 0:
                print("\n❌ ПРОБЛЕМА: API показывает 0 событий, но есть последние события")
                print("   Это означает, что код на Render не обновился с новой логикой")
                print("   Рекомендация: перезапустить сервис на Render")
            else:
                print("\n✅ API работает корректно с новой логикой")
                
        else:
            print(f"❌ Ошибка API: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Ошибка при отладке: {e}")

if __name__ == "__main__":
    debug_render_logic()
