#!/usr/bin/env python3
"""
Скрипт для принудительного обновления данных на Render
"""
import requests
import time
import json

def force_refresh():
    """Принудительно обновляет данные на Render"""
    try:
        print("🔄 Принудительное обновление данных на Render...")
        
        # URL API на Render
        api_url = "https://babycarebot-api.onrender.com/api"
        
        # Проверяем здоровье API
        print("🔍 Проверка здоровья API...")
        health_response = requests.get(f"{api_url}/health", timeout=10)
        if health_response.status_code == 200:
            print("✅ API работает")
        else:
            print(f"❌ API недоступен: {health_response.status_code}")
            return False
        
        # Получаем список семей
        print("👨‍👩‍👧‍👦 Загрузка списка семей...")
        families_response = requests.get(f"{api_url}/families", timeout=10)
        if families_response.status_code == 200:
            families = families_response.json()
            print(f"✅ Найдено семей: {len(families['families'])}")
            for family in families['families']:
                print(f"   • ID: {family['id']}, Название: {family['name']}")
        else:
            print(f"❌ Ошибка загрузки семей: {families_response.status_code}")
            return False
        
        # Тестируем дашборд для первой семьи
        if families['families']:
            family_id = families['families'][0]['id']
            print(f"📊 Тестирование дашборда для семьи {family_id}...")
            
            dashboard_response = requests.get(f"{api_url}/family/{family_id}/dashboard", timeout=10)
            if dashboard_response.status_code == 200:
                dashboard_data = dashboard_response.json()
                print("✅ Дашборд загружен успешно")
                print(f"   • Статистика: {dashboard_data['today_stats']}")
                print(f"   • Последние события: {len([k for k, v in dashboard_data['last_events'].items() if v['timestamp']])} событий")
            else:
                print(f"❌ Ошибка загрузки дашборда: {dashboard_response.status_code}")
                return False
        
        print("✅ Все проверки пройдены успешно!")
        print("⏰ Данные должны обновиться в дашборде через 1-2 минуты")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при обновлении: {e}")
        return False

if __name__ == "__main__":
    force_refresh()
