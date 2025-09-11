#!/usr/bin/env python3
"""
Скрипт для запуска API сервера без Flask
"""

import sys
import os
from api_simple import run_api_server

def main():
    """Главная функция"""
    print("🚀 Запуск BabyCareBot API (без Flask)")
    print("=" * 50)
    
    # Получаем порт из аргументов командной строки или переменных окружения
    port = 5000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Ошибка: Порт должен быть числом")
            print("Использование: python start_api.py [PORT]")
            sys.exit(1)
    else:
        port = int(os.getenv('API_PORT', 5000))
    
    print(f"🔧 Используется порт: {port}")
    print(f"📦 Зависимости: только стандартная библиотека Python + dotenv + pytz")
    print(f"🚫 Flask удален из проекта")
    print("=" * 50)
    
    # Запускаем сервер
    run_api_server(port)

if __name__ == '__main__':
    main()
