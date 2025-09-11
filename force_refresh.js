// Скрипт для принудительного обновления фронтенда
console.log('🔄 Принудительное обновление фронтенда...');

// Очищаем все кэши
if ('caches' in window) {
    caches.keys().then(function(names) {
        for (let name of names) {
            caches.delete(name);
        }
        console.log('✅ Кэши очищены');
    });
}

// Принудительно перезагружаем страницу
setTimeout(() => {
    console.log('🔄 Перезагрузка страницы...');
    window.location.reload(true);
}, 1000);