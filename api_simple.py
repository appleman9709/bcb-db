#!/usr/bin/env python3
"""
Простой API сервер без Flask для BabyCareBot
Использует встроенный HTTP сервер Python
"""

import http.server
import socketserver
import json
import sqlite3
import os
import urllib.parse
from datetime import datetime, timedelta
import pytz
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

class BabyCareAPIHandler(http.server.BaseHTTPRequestHandler):
    """Обработчик HTTP запросов для BabyCareBot API"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """Обработка GET запросов"""
        try:
            # Парсим URL
            parsed_path = urllib.parse.urlparse(self.path)
            path_parts = parsed_path.path.strip('/').split('/')
            
            # CORS заголовки
            self.send_cors_headers()
            
            # Маршрутизация
            if path_parts[0] == 'api':
                if len(path_parts) == 2 and path_parts[1] == 'health':
                    self.handle_health()
                elif len(path_parts) == 2 and path_parts[1] == 'families':
                    self.handle_families()
                elif len(path_parts) == 4 and path_parts[1] == 'family':
                    family_id = int(path_parts[2])
                    endpoint = path_parts[3]
                    if endpoint == 'dashboard':
                        self.handle_family_dashboard(family_id)
                    elif endpoint == 'history':
                        self.handle_family_history(family_id)
                    elif endpoint == 'members':
                        self.handle_family_members(family_id)
                    else:
                        self.send_error(404, "Endpoint not found")
                else:
                    self.send_error(404, "API endpoint not found")
            else:
                self.send_error(404, "Not found")
                
        except Exception as e:
            print(f"❌ Ошибка в do_GET: {e}")
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def send_cors_headers(self):
        """Отправка CORS заголовков"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Type', 'application/json')
    
    def send_json_response(self, data, status_code=200):
        """Отправка JSON ответа"""
        self.send_response(status_code)
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def get_thai_time(self):
        """Получить текущее время в тайском часовом поясе"""
        thai_tz = pytz.timezone('Asia/Bangkok')
        utc_now = datetime.now(pytz.UTC)
        thai_now = utc_now.astimezone(thai_tz)
        return thai_now
    
    def get_thai_date(self):
        """Получить текущую дату в тайском часовом поясе"""
        return self.get_thai_time().date()
    
    def get_db_connection(self):
        """Безопасное подключение к базе данных"""
        try:
            # Пытаемся подключиться к локальной БД (для разработки)
            if os.path.exists("babybot.db"):
                conn = sqlite3.connect("babybot.db")
                print("✅ Подключение к локальной БД babybot.db")
            elif os.path.exists("babybot_render.db"):
                conn = sqlite3.connect("babybot_render.db")
                print("✅ Подключение к БД babybot_render.db")
            else:
                # На Render создаем тестовую БД или возвращаем None
                print("⚠️ База данных не найдена, используем тестовые данные")
                return None
                
            conn.row_factory = sqlite3.Row  # Возвращаем результаты как словари
            return conn
        except Exception as e:
            print(f"❌ Ошибка подключения к БД: {e}")
            return None
    
    def handle_health(self):
        """Проверка здоровья API"""
        data = {
            "status": "healthy", 
            "timestamp": datetime.now().isoformat(),
            "server": "Simple HTTP Server (no Flask)"
        }
        self.send_json_response(data)
    
    def handle_families(self):
        """Получить список всех семей"""
        try:
            print(f"🔍 Запрос на получение списка семей")
            conn = self.get_db_connection()
            if not conn:
                print(f"⚠️ База данных недоступна, возвращаем тестовые данные")
                # Возвращаем тестовые данные для демонстрации
                test_families = [
                    {"id": 1, "name": "Семья Ивановых"},
                    {"id": 2, "name": "Семья Петровых"}
                ]
                print(f"✅ Возвращаем тестовые семьи: {len(test_families)}")
                self.send_json_response({"families": test_families})
                return
            
            cur = conn.cursor()
            cur.execute("SELECT id, name FROM families ORDER BY name")
            families = [{"id": row['id'], "name": row['name']} for row in cur.fetchall()]
            
            print(f"✅ Найдено семей: {len(families)}")
            for family in families:
                print(f"   • ID: {family['id']}, Название: {family['name']}")
            
            conn.close()
            self.send_json_response({"families": families})
            
        except Exception as e:
            print(f"❌ Ошибка в handle_families: {str(e)}")
            self.send_json_response({"error": str(e)}, 500)
    
    def handle_family_dashboard(self, family_id):
        """Получить данные дашборда для семьи"""
        try:
            # Получаем параметр периода из query string
            parsed_url = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            period = query_params.get('period', ['today'])[0]
            
            conn = self.get_db_connection()
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
                self.send_json_response(test_data)
                return
            
            cur = conn.cursor()
            
            # Получаем информацию о семье
            cur.execute("SELECT name FROM families WHERE id = ?", (family_id,))
            family = cur.fetchone()
            if not family:
                self.send_json_response({"error": "Family not found"}, 404)
                return
            
            # Получаем настройки семьи
            cur.execute("""
                SELECT feed_interval, diaper_interval, baby_age_months, baby_birth_date,
                       tips_enabled, bath_reminder_enabled, activity_reminder_enabled
                FROM settings WHERE family_id = ?
            """, (family_id,))
            settings = cur.fetchone()
            
            # Получаем последние события
            today = self.get_thai_date()
            
            # Определяем период для статистики
            if period == 'week':
                start_date = datetime.combine(today - timedelta(days=6), datetime.min.time()).isoformat()
                end_date = datetime.combine(today, datetime.max.time()).isoformat()
            elif period == 'month':
                start_date = datetime.combine(today - timedelta(days=29), datetime.min.time()).isoformat()
                end_date = datetime.combine(today, datetime.max.time()).isoformat()
            else:  # today
                start_date = datetime.combine(today, datetime.min.time()).isoformat()
                end_date = datetime.combine(today, datetime.max.time()).isoformat()
            
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
            
            # Активная сессия сна
            cur.execute("""
                SELECT start_time, author_role, author_name 
                FROM sleep_sessions 
                WHERE family_id = ? AND is_active = 1 
                ORDER BY start_time DESC 
                LIMIT 1
            """, (family_id,))
            active_sleep = cur.fetchone()
            
            # Статистика за период
            cur.execute("""
                SELECT COUNT(*) as count 
                FROM feedings 
                WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            """, (family_id, start_date, end_date))
            period_feedings = cur.fetchone()['count']
            
            cur.execute("""
                SELECT COUNT(*) as count 
                FROM diapers 
                WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            """, (family_id, start_date, end_date))
            period_diapers = cur.fetchone()['count']
            
            cur.execute("""
                SELECT COUNT(*) as count 
                FROM baths 
                WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            """, (family_id, start_date, end_date))
            period_baths = cur.fetchone()['count']
            
            cur.execute("""
                SELECT COUNT(*) as count 
                FROM activities 
                WHERE family_id = ? AND timestamp BETWEEN ? AND ?
            """, (family_id, start_date, end_date))
            period_activities = cur.fetchone()['count']
            
            # Вычисляем время с последних событий
            current_time = self.get_thai_time()
            
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
                    "feedings": period_feedings,
                    "diapers": period_diapers,
                    "baths": period_baths,
                    "activities": period_activities
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
            self.send_json_response(dashboard_data)
            
        except Exception as e:
            print(f"❌ Ошибка в handle_family_dashboard: {e}")
            self.send_json_response({"error": str(e)}, 500)
    
    def handle_family_history(self, family_id):
        """Получить историю событий для семьи"""
        try:
            # Получаем параметр days из query string
            parsed_url = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            days = int(query_params.get('days', ['7'])[0])
            
            if days > 30:  # Ограничиваем максимум 30 дней
                days = 30
            
            conn = self.get_db_connection()
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
                
                self.send_json_response({
                    "family_id": family_id,
                    "family_name": f"Семья {family_id}",
                    "period_days": days,
                    "history": test_history
                })
                return
            
            cur = conn.cursor()
            
            # Проверяем существование семьи
            cur.execute("SELECT name FROM families WHERE id = ?", (family_id,))
            family = cur.fetchone()
            if not family:
                self.send_json_response({"error": "Family not found"}, 404)
                return
            
            # Получаем события за последние N дней
            end_date = self.get_thai_date()
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
            self.send_json_response({
                "family_id": family_id,
                "family_name": family['name'],
                "period_days": days,
                "history": history_data
            })
            
        except Exception as e:
            print(f"❌ Ошибка в handle_family_history: {e}")
            self.send_json_response({"error": str(e)}, 500)
    
    def handle_family_members(self, family_id):
        """Получить список членов семьи"""
        try:
            conn = self.get_db_connection()
            if not conn:
                print(f"⚠️ База данных недоступна, возвращаем тестовые данные членов для семьи {family_id}")
                # Возвращаем тестовые данные для демонстрации
                test_members = [
                    {"user_id": 1, "role": "Мама", "name": "Анна"},
                    {"user_id": 2, "role": "Папа", "name": "Иван"},
                    {"user_id": 3, "role": "Бабушка", "name": "Мария"}
                ]
                
                self.send_json_response({
                    "family_id": family_id,
                    "family_name": f"Семья {family_id}",
                    "members": test_members
                })
                return
            
            cur = conn.cursor()
            
            # Проверяем существование семьи
            cur.execute("SELECT name FROM families WHERE id = ?", (family_id,))
            family = cur.fetchone()
            if not family:
                self.send_json_response({"error": "Family not found"}, 404)
                return
            
            # Получаем членов семьи
            cur.execute("""
                SELECT user_id, role, name 
                FROM family_members 
                WHERE family_id = ? 
                ORDER BY role, name
            """, (family_id,))
            members = [dict(row) for row in cur.fetchall()]
            
            conn.close()
            self.send_json_response({
                "family_id": family_id,
                "family_name": family['name'],
                "members": members
            })
            
        except Exception as e:
            print(f"❌ Ошибка в handle_family_members: {e}")
            self.send_json_response({"error": str(e)}, 500)
    
    def do_OPTIONS(self):
        """Обработка OPTIONS запросов для CORS"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def log_message(self, format, *args):
        """Переопределяем логирование для более читаемого вывода"""
        print(f"🌐 {self.address_string()} - {format % args}")

def run_api_server(port=5000):
    """Запуск API сервера"""
    try:
        # Создаем обработчик
        handler = BabyCareAPIHandler
        
        # Создаем сервер
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"🚀 BabyCareBot API (без Flask) запущен на порту {port}")
            print(f"📊 Доступные эндпоинты:")
            print(f"   • GET /api/health - проверка здоровья")
            print(f"   • GET /api/families - список семей")
            print(f"   • GET /api/family/<id>/dashboard - дашборд семьи")
            print(f"   • GET /api/family/<id>/history - история семьи")
            print(f"   • GET /api/family/<id>/members - члены семьи")
            print(f"🔧 Сервер использует встроенный HTTP сервер Python (без Flask)")
            print(f"🌐 Откройте http://localhost:{port}/api/health для проверки")
            print(f"⏹️  Нажмите Ctrl+C для остановки")
            
            # Запускаем сервер
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n⏹️  Сервер остановлен пользователем")
    except Exception as e:
        print(f"❌ Ошибка запуска сервера: {e}")

if __name__ == '__main__':
    # Получаем порт из переменных окружения или используем 5000 по умолчанию
    port = int(os.getenv('API_PORT', 5000))
    run_api_server(port)
