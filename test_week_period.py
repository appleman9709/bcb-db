#!/usr/bin/env python3
"""
Тест периода week на Render
"""
import requests
import json

def test_week_period():
    """Тестирует период week на Render"""
    try:
        print("🔍 Тестирование периода 'week' на Render...")
        
        api_url = "https://babycarebot-api.onrender.com/api"
        
        # Получаем дашборд для периода week
        response = requests.get(f"{api_url}/family/1/dashboard?period=week", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            print("✅ Данные получены успешно")
            print(f"📊 Статистика: {data.get('today_stats', {})}")
            
            # Проверяем последние события
            last_events = data.get('last_events', {})
            feeding_time = last_events.get('feeding', {}).get('timestamp')
            diaper_time = last_events.get('diaper', {}).get('timestamp')
            
            print(f"🕐 Последние события:")
            print(f"   • Кормление: {feeding_time}")
            print(f"   • Подгузник: {diaper_time}")
            
            stats = data.get('today_stats', {})
            if stats.get('feedings', 0) > 0 or stats.get('diapers', 0) > 0:
                print("✅ Период 'week' работает - данные есть!")
                return True
            else:
                print("❌ Период 'week' тоже не работает")
                return False
                
        else:
            print(f"❌ Ошибка получения данных: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        return False

if __name__ == "__main__":
    test_week_period()
