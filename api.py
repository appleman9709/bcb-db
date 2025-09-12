from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
import pytz
import os
from dotenv import load_dotenv
import requests
import json

# Загружаем переменные окружения
load_dotenv()

app = Flask(__name__)
CORS(app)  # Разрешаем CORS для фронтенда

# Конфигурация удаленной базы данных
REMOTE_DB_CONFIG = {
    'host': 'watermelon.fps.ms',
    'port': 10791,
    'path': '/home/container/',
    'db_name': 'babybot.db'
}

def get_remote_db_url():
    """Получить URL для подключения к удаленной базе данных"""
    return f"http://{REMOTE_DB_CONFIG['host']}:{REMOTE_DB_CONFIG['port']}{REMOTE_DB_CONFIG['path']}{REMOTE_DB_CONFIG['db_name']}"

def execute_remote_query(query, params=None):
    """Выполнить SQL запрос к удаленной базе данных"""
    try:
        # Предполагаем, что на удаленном сервере есть API для работы с БД
        api_url = f"http://{REMOTE_DB_CONFIG['host']}:{REMOTE_DB_CONFIG['port']}/api/query"
        
        payload = {
            'query': query,
            'params': params or []
        }
        
        response = requests.post(api_url, json=payload, timeout=10)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Ошибка удаленного запроса: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Ошибка подключения к удаленной БД: {e}")
        return None

# Функция для получения тайского времени
def get_thai_time():
    """Получить текущее время в тайском часовом поясе"""
    thai_tz = pytz.timezone('Asia/Bangkok')
    utc_now = datetime.now(pytz.UTC)
    thai_now = utc_now.astimezone(thai_tz)
    return thai_now

def get_thai_date():
    """Получить текущую дату в тайском часовом поясе"""
    return get_thai_time().date()

# Функция для безопасного подключения к БД
def get_db_connection():
    """Безопасное подключение к базе данных"""
    try:
        # Сначала пытаемся подключиться к удаленной БД
        print("🔍 Попытка подключения к удаленной БД...")
        test_query = execute_remote_query("SELECT 1 as test")
        if test_query:
            print("✅ Подключение к удаленной БД успешно")
            return "remote"  # Возвращаем специальный маркер для удаленной БД
        
        # Если удаленная БД недоступна, пробуем локальные файлы
        print("⚠️ Удаленная БД недоступна, пробуем локальные файлы...")
        
        if os.path.exists("babybot_render.db"):
            conn = sqlite3.connect("babybot_render.db")
            print("✅ Подключение к БД babybot_render.db")
        elif os.path.exists("babybot.db"):
            conn = sqlite3.connect("babybot.db")
            print("✅ Подключение к локальной БД babybot.db")
        else:
            print("⚠️ База данных не найдена, используем тестовые данные")
            return None
            
        conn.row_factory = sqlite3.Row  # Возвращаем результаты как словари
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")
        return None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка здоровья API"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/api/family/<int:family_id>/dashboard', methods=['GET'])
def get_family_dashboard(family_id):
    """Получить данные дашборда для семьи"""
    # Получаем параметр периода
    period = request.args.get('period', 'today')
    try:
        conn = get_db_connection()
        if not conn:
            print(f"⚠️ База данных недоступна, возвращаем тестовые данные для семьи {family_id}")
            # Возвращаем тестовые данные для демонстрации
            test_data = {
                "family": {
                    "id": family_id,
                    "name": f"Семья {family_id}"
                },
                "settings": {
                    "feed_interval": 3,
                    "diaper_interval": 2,
                    "baby_age_months": 6,
                    "baby_birth_date": "2025-02-28",
                    "tips_enabled": True,
                    "bath_reminder_enabled": True,
                    "activity_reminder_enabled": True
                },
                "last_events": {
                    "feeding": {
                        "timestamp": "2025-08-31T20:00:00",
                        "author_role": "Мама",
                        "author_name": "Анна",
                        "time_ago": {"hours": 2, "minutes": 30}
                    },
                    "diaper": {
                        "timestamp": "2025-08-31T21:30:00",
                        "author_role": "Папа",
                        "author_name": "Иван",
                        "time_ago": {"hours": 1, "minutes": 0}
                    },
                    "bath": {
                        "timestamp": "2025-08-31T19:00:00",
                        "author_role": "Мама",
                        "author_name": "Анна",
                        "time_ago": {"hours": 3, "minutes": 30}
                    },
                    "activity": {
                        "timestamp": "2025-08-31T22:00:00",
                        "activity_type": "Игра",
                        "author_role": "Бабушка",
                        "author_name": "Мария",
                        "time_ago": {"hours": 0, "minutes": 30}
                    }
                },
                "sleep": {
                    "is_active": False,
                    "start_time": None,
                    "author_role": None,
                    "author_name": None,
                    "duration": None
                },
                "today_stats": {
                    "feedings": 5 if period == 'today' else (35 if period == 'week' else 150),
                    "diapers": 4 if period == 'today' else (28 if period == 'week' else 120),
                    "baths": 1 if period == 'today' else (7 if period == 'week' else 30),
                    "activities": 3 if period == 'today' else (21 if period == 'week' else 90)
                }
            }
            return jsonify(test_data)
        
        cur = conn.cursor()
        
        # Получаем информацию о семье
        cur.execute("SELECT name FROM families WHERE id = ?", (family_id,))
        family = cur.fetchone()
        if not family:
            return jsonify({"error": "Family not found"}), 404
        
        # Получаем настройки семьи
        cur.execute("""
            SELECT feed_interval, diaper_interval, baby_age_months, baby_birth_date,
                   tips_enabled, bath_reminder_enabled, activity_reminder_enabled
            FROM settings WHERE family_id = ?
        """, (family_id,))
        settings = cur.fetchone()
        
        # Получаем последние события
        today = get_thai_date()
        
        # Определяем период для статистики
        if period == 'week':
            start_date = datetime.combine(today - timedelta(days=6), datetime.min.time()).isoformat()
            end_date = datetime.combine(today, datetime.max.time()).isoformat()
        elif period == 'month':
            start_date = datetime.combine(today - timedelta(days=29), datetime.min.time()).isoformat()
            end_date = datetime.combine(today, datetime.max.time()).isoformat()
        else:  # today - показываем данные за последние 48 часов
            # Для "сегодня" показываем данные за последние 48 часов, чтобы включить вчерашние события
            current_time = get_thai_time()
            start_date = (current_time - timedelta(hours=48)).isoformat()
            end_date = current_time.isoformat()
        
        # Последнее кормление
        cur.execute("""
            SELECT timestamp, author_role, author_name 
            FROM feedings 
            WHERE family_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (family_id,))
        last_feeding = cur.fetchone()
        
        # Последняя смена подгузника
        cur.execute("""
            SELECT timestamp, author_role, author_name 
            FROM diapers 
            WHERE family_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (family_id,))
        last_diaper = cur.fetchone()
        
        # Последнее купание
        cur.execute("""
            SELECT timestamp, author_role, author_name 
            FROM baths 
            WHERE family_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (family_id,))
        last_bath = cur.fetchone()
        
        # Последняя активность
        cur.execute("""
            SELECT timestamp, activity_type, author_role, author_name 
            FROM activities 
            WHERE family_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (family_id,))
        last_activity = cur.fetchone()
        
        # Отладочная информация для последних событий
        print(f"🕐 Последние события для семьи {family_id}:")
        print(f"   • Кормление: {last_feeding['timestamp'] if last_feeding else 'Нет данных'}")
        print(f"   • Подгузник: {last_diaper['timestamp'] if last_diaper else 'Нет данных'}")
        print(f"   • Купание: {last_bath['timestamp'] if last_bath else 'Нет данных'}")
        print(f"   • Активность: {last_activity['timestamp'] if last_activity else 'Нет данных'}")
        
        # Активная сессия сна
        cur.execute("""
            SELECT start_time, author_role, author_name 
            FROM sleep_sessions 
            WHERE family_id = ? AND is_active = 1 
            ORDER BY start_time DESC 
            LIMIT 1
        """, (family_id,))
        active_sleep = cur.fetchone()
        
        # Статистика за сегодня
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
            FROM baths 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        today_baths = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM activities 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
        """, (family_id, start_date, end_date))
        today_activities = cur.fetchone()['count']
        
        # Отладочная информация
        print(f"📊 Статистика для семьи {family_id} за период {period}:")
        print(f"   • Кормления: {today_feedings}")
        print(f"   • Подгузники: {today_diapers}")
        print(f"   • Купания: {today_baths}")
        print(f"   • Активности: {today_activities}")
        print(f"   • Период: {start_date} - {end_date}")
        print(f"   • Текущее время: {get_thai_time().isoformat()}")
        
        # Вычисляем время с последних событий
        current_time = get_thai_time()
        
        dashboard_data = {
            "family": {
                "id": family_id,
                "name": family['name']
            },
            "settings": {
                "feed_interval": settings['feed_interval'] if settings else 3,
                "diaper_interval": settings['diaper_interval'] if settings else 2,
                "baby_age_months": settings['baby_age_months'] if settings else 0,
                "baby_birth_date": settings['baby_birth_date'] if settings else None,
                "tips_enabled": bool(settings['tips_enabled']) if settings else True,
                "bath_reminder_enabled": bool(settings['bath_reminder_enabled']) if settings else True,
                "activity_reminder_enabled": bool(settings['activity_reminder_enabled']) if settings else True
            },
            "last_events": {
                "feeding": {
                    "timestamp": last_feeding['timestamp'] if last_feeding else None,
                    "author_role": last_feeding['author_role'] if last_feeding else None,
                    "author_name": last_feeding['author_name'] if last_feeding else None,
                    "time_ago": None
                },
                "diaper": {
                    "timestamp": last_diaper['timestamp'] if last_diaper else None,
                    "author_role": last_diaper['author_role'] if last_diaper else None,
                    "author_name": last_diaper['author_name'] if last_diaper else None,
                    "time_ago": None
                },
                "bath": {
                    "timestamp": last_bath['timestamp'] if last_bath else None,
                    "author_role": last_bath['author_role'] if last_bath else None,
                    "author_name": last_bath['author_name'] if last_bath else None,
                    "time_ago": None
                },
                "activity": {
                    "timestamp": last_activity['timestamp'] if last_activity else None,
                    "activity_type": last_activity['activity_type'] if last_activity else None,
                    "author_role": last_activity['author_role'] if last_activity else None,
                    "author_name": last_activity['author_name'] if last_activity else None,
                    "time_ago": None
                }
            },
            "sleep": {
                "is_active": active_sleep is not None,
                "start_time": active_sleep['start_time'] if active_sleep else None,
                "author_role": active_sleep['author_role'] if active_sleep else None,
                "author_name": active_sleep['author_name'] if active_sleep else None,
                "duration": None
            },
            "today_stats": {
                "feedings": today_feedings,
                "diapers": today_diapers,
                "baths": today_baths,
                "activities": today_activities
            }
        }
        
        # Вычисляем время с последних событий
        if last_feeding:
            last_feeding_time = datetime.fromisoformat(last_feeding['timestamp'])
            time_diff = current_time - last_feeding_time
            dashboard_data["last_events"]["feeding"]["time_ago"] = {
                "hours": int(time_diff.total_seconds() // 3600),
                "minutes": int((time_diff.total_seconds() % 3600) // 60)
            }
        
        if last_diaper:
            last_diaper_time = datetime.fromisoformat(last_diaper['timestamp'])
            time_diff = current_time - last_diaper_time
            dashboard_data["last_events"]["diaper"]["time_ago"] = {
                "hours": int(time_diff.total_seconds() // 3600),
                "minutes": int((time_diff.total_seconds() % 3600) // 60)
            }
        
        if last_bath:
            last_bath_time = datetime.fromisoformat(last_bath['timestamp'])
            time_diff = current_time - last_bath_time
            dashboard_data["last_events"]["bath"]["time_ago"] = {
                "hours": int(time_diff.total_seconds() // 3600),
                "minutes": int((time_diff.total_seconds() % 3600) // 60)
            }
        
        if last_activity:
            last_activity_time = datetime.fromisoformat(last_activity['timestamp'])
            time_diff = current_time - last_activity_time
            dashboard_data["last_events"]["activity"]["time_ago"] = {
                "hours": int(time_diff.total_seconds() // 3600),
                "minutes": int((time_diff.total_seconds() % 3600) // 60)
            }
        
        # Вычисляем длительность сна
        if active_sleep:
            start_time = datetime.fromisoformat(active_sleep['start_time'])
            time_diff = current_time - start_time
            dashboard_data["sleep"]["duration"] = {
                "hours": int(time_diff.total_seconds() // 3600),
                "minutes": int((time_diff.total_seconds() % 3600) // 60)
            }
        
        conn.close()
        return jsonify(dashboard_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/family/<int:family_id>/history', methods=['GET'])
def get_family_history(family_id):
    """Получить историю событий для семьи"""
    try:
        days = request.args.get('days', 7, type=int)
        if days > 30:  # Ограничиваем максимум 30 дней
            days = 30
        
        conn = get_db_connection()
        if not conn:
            print(f"⚠️ База данных недоступна, возвращаем тестовые данные истории для семьи {family_id}")
            # Возвращаем тестовые данные для демонстрации
            from datetime import date
            test_history = []
            for i in range(days):
                current_date = date.today() - timedelta(days=i)
                test_history.append({
                    "date": current_date.isoformat(),
                    "feedings": max(0, 5 - i),
                    "diapers": max(0, 4 - i),
                    "baths": 1 if i % 3 == 0 else 0,
                    "activities": max(0, 3 - i)
                })
            
            return jsonify({
                "family_id": family_id,
                "family_name": f"Семья {family_id}",
                "period_days": days,
                "history": test_history
            })
        
        cur = conn.cursor()
        
        # Проверяем существование семьи
        cur.execute("SELECT name FROM families WHERE id = ?", (family_id,))
        family = cur.fetchone()
        if not family:
            return jsonify({"error": "Family not found"}), 404
        
        # Получаем события за последние N дней
        end_date = get_thai_date()
        start_date = end_date - timedelta(days=days-1)
        
        start_datetime = datetime.combine(start_date, datetime.min.time()).isoformat()
        end_datetime = datetime.combine(end_date, datetime.max.time()).isoformat()
        
        # Кормления
        cur.execute("""
            SELECT DATE(timestamp) as date, COUNT(*) as count
            FROM feedings 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        """, (family_id, start_datetime, end_datetime))
        feedings_by_day = {row['date']: row['count'] for row in cur.fetchall()}
        
        # Смены подгузников
        cur.execute("""
            SELECT DATE(timestamp) as date, COUNT(*) as count
            FROM diapers 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        """, (family_id, start_datetime, end_datetime))
        diapers_by_day = {row['date']: row['count'] for row in cur.fetchall()}
        
        # Купания
        cur.execute("""
            SELECT DATE(timestamp) as date, COUNT(*) as count
            FROM baths 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        """, (family_id, start_datetime, end_datetime))
        baths_by_day = {row['date']: row['count'] for row in cur.fetchall()}
        
        # Активности
        cur.execute("""
            SELECT DATE(timestamp) as date, COUNT(*) as count
            FROM activities 
            WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        """, (family_id, start_datetime, end_datetime))
        activities_by_day = {row['date']: row['count'] for row in cur.fetchall()}
        
        # Формируем данные по дням
        history_data = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.isoformat()
            
            history_data.append({
                "date": date_str,
                "feedings": feedings_by_day.get(date_str, 0),
                "diapers": diapers_by_day.get(date_str, 0),
                "baths": baths_by_day.get(date_str, 0),
                "activities": activities_by_day.get(date_str, 0)
            })
        
        conn.close()
        return jsonify({
            "family_id": family_id,
            "family_name": family['name'],
            "period_days": days,
            "history": history_data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/family/<int:family_id>/members', methods=['GET'])
def get_family_members(family_id):
    """Получить список членов семьи"""
    try:
        conn = get_db_connection()
        if not conn:
            print(f"⚠️ База данных недоступна, возвращаем тестовые данные членов для семьи {family_id}")
            # Возвращаем тестовые данные для демонстрации
            test_members = [
                {"user_id": 1, "role": "Мама", "name": "Анна"},
                {"user_id": 2, "role": "Папа", "name": "Иван"},
                {"user_id": 3, "role": "Бабушка", "name": "Мария"}
            ]
            
            return jsonify({
                "family_id": family_id,
                "family_name": f"Семья {family_id}",
                "members": test_members
            })
        
        cur = conn.cursor()
        
        # Проверяем существование семьи
        cur.execute("SELECT name FROM families WHERE id = ?", (family_id,))
        family = cur.fetchone()
        if not family:
            return jsonify({"error": "Family not found"}), 404
        
        # Получаем членов семьи
        cur.execute("""
            SELECT user_id, role, name 
            FROM family_members 
            WHERE family_id = ? 
            ORDER BY role, name
        """, (family_id,))
        members = [dict(row) for row in cur.fetchall()]
        
        conn.close()
        return jsonify({
            "family_id": family_id,
            "family_name": family['name'],
            "members": members
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/families', methods=['GET'])
def get_families():
    """Получить список всех семей (только ID и названия)"""
    try:
        print(f"🔍 Запрос на получение списка семей")
        conn = get_db_connection()
        if not conn:
            print(f"⚠️ База данных недоступна, возвращаем тестовые данные")
            # Возвращаем тестовые данные для демонстрации
            test_families = [
                {"id": 1, "name": "Семья Ивановых"},
                {"id": 2, "name": "Семья Петровых"}
            ]
            print(f"✅ Возвращаем тестовые семьи: {len(test_families)}")
            return jsonify({"families": test_families})
        
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM families ORDER BY name")
        families = [{"id": row['id'], "name": row['name']} for row in cur.fetchall()]
        
        print(f"✅ Найдено семей: {len(families)}")
        for family in families:
            print(f"   • ID: {family['id']}, Название: {family['name']}")
        
        conn.close()
        return jsonify({"families": families})
        
    except Exception as e:
        print(f"❌ Ошибка в get_families: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Получаем порт из переменных окружения или используем 5000 по умолчанию
    port = int(os.getenv('API_PORT', 5000))
    
    print(f"🚀 BabyCareBot API запущен на порту {port}")
    print(f"📊 Доступные эндпоинты:")
    print(f"   • GET /api/health - проверка здоровья")
    print(f"   • GET /api/families - список семей")
    print(f"   • GET /api/family/<id>/dashboard - дашборд семьи")
    print(f"   • GET /api/family/<id>/history - история семьи")
    print(f"   • GET /api/family/<id>/members - члены семьи")
    
    # Для Render используем host='0.0.0.0'
    app.run(host='0.0.0.0', port=port, debug=False)
