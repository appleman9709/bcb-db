#!/usr/bin/env python3
"""
Скрипт для синхронизации данных с удаленного сервера watermelon.fps.ms:10791
"""
import os
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime
import requests
import json

def sync_from_remote():
    """Синхронизирует данные с удаленного сервера"""
    try:
        print(f"🔄 Синхронизация с удаленного сервера - {datetime.now().strftime('%H:%M:%S')}")
        
        # URL удаленного сервера
        remote_url = "http://watermelon.fps.ms:10791"
        
        # Проверяем доступность удаленного сервера
        print("🔍 Проверка доступности удаленного сервера...")
        try:
            response = requests.get(f"{remote_url}/api/health", timeout=10)
            if response.status_code == 200:
                print("✅ Удаленный сервер доступен")
            else:
                print(f"⚠️ Удаленный сервер отвечает с кодом: {response.status_code}")
        except Exception as e:
            print(f"❌ Удаленный сервер недоступен: {e}")
            print("🔄 Пробуем альтернативный способ...")
            
            # Если API недоступен, пробуем скачать файл базы данных напрямую
            try:
                db_url = f"{remote_url}/home/container/babybot.db"
                print(f"📥 Попытка скачать БД: {db_url}")
                
                response = requests.get(db_url, timeout=30)
                if response.status_code == 200:
                    # Сохраняем скачанную базу данных
                    with open("babybot_remote.db", "wb") as f:
                        f.write(response.content)
                    print("✅ База данных скачана успешно")
                    
                    # Проверяем скачанную базу
                    conn = sqlite3.connect("babybot_remote.db")
                    cursor = conn.cursor()
                    
                    # Проверяем статистику
                    cursor.execute("SELECT COUNT(*) FROM feedings")
                    feedings = cursor.fetchone()[0]
                    
                    cursor.execute("SELECT COUNT(*) FROM diapers")
                    diapers = cursor.fetchone()[0]
                    
                    cursor.execute("SELECT COUNT(*) FROM activities")
                    activities = cursor.fetchone()[0]
                    
                    cursor.execute("SELECT COUNT(*) FROM baths")
                    baths = cursor.fetchone()[0]
                    
                    print(f"📊 Данные в удаленной БД:")
                    print(f"   • Кормления: {feedings}")
                    print(f"   • Подгузники: {diapers}")
                    print(f"   • Активности: {activities}")
                    print(f"   • Купания: {baths}")
                    
                    conn.close()
                    
                    # Копируем для Render
                    shutil.copy2("babybot_remote.db", "babybot_render.db")
                    print("✅ База данных скопирована для Render")
                    
                    return True
                else:
                    print(f"❌ Не удалось скачать БД: {response.status_code}")
                    return False
                    
            except Exception as e2:
                print(f"❌ Ошибка при скачивании БД: {e2}")
                return False
        
        # Если API доступен, получаем данные через API
        print("📡 Получение данных через API...")
        
        # Получаем список семей
        families_response = requests.get(f"{remote_url}/api/families", timeout=10)
        if families_response.status_code == 200:
            families = families_response.json()
            print(f"✅ Получено семей: {len(families.get('families', []))}")
        
        # Получаем данные дашборда для первой семьи
        if families.get('families'):
            family_id = families['families'][0]['id']
            dashboard_response = requests.get(f"{remote_url}/api/family/{family_id}/dashboard", timeout=10)
            if dashboard_response.status_code == 200:
                dashboard_data = dashboard_response.json()
                print("✅ Данные дашборда получены")
                print(f"   • Статистика: {dashboard_data.get('today_stats', {})}")
        
        print("✅ Синхронизация завершена успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при синхронизации: {e}")
        return False

if __name__ == "__main__":
    sync_from_remote()
