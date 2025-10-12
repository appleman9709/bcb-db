#!/bin/bash

echo "Развертывание Судоку Тетрис на Vercel..."
echo

echo "Установка зависимостей..."
npm install

echo
echo "Сборка проекта с Vite..."
npm run build

echo
echo "Проверка установки Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI не установлен. Устанавливаем..."
    npm install -g vercel
fi

echo
echo "Вход в аккаунт Vercel..."
vercel login

echo
echo "Развертывание проекта..."
vercel --prod

echo
echo "Готово! Ваша игра развернута на Vercel."
