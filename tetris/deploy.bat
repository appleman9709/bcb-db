@echo off
echo Развертывание Судоку Тетрис на Vercel...
echo.

echo Установка зависимостей...
npm install

echo.
echo Сборка проекта с Vite...
npm run build

echo.
echo Проверка установки Vercel CLI...
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI не установлен. Устанавливаем...
    npm install -g vercel
)

echo.
echo Вход в аккаунт Vercel...
vercel login

echo.
echo Развертывание проекта...
vercel --prod

echo.
echo Готово! Ваша игра развернута на Vercel.
pause
