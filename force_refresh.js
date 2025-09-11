// Скрипт для принудительного обновления дашборда
// Добавьте этот код в консоль браузера (F12)

// Очистка кэша
if ('caches' in window) {
    caches.keys().then(function(names) {
        for (let name of names) {
            caches.delete(name);
        }
        console.log('Кэш очищен');
    });
}

// Принудительное обновление
location.reload(true);

// Альтернативный способ - очистка localStorage
localStorage.clear();
sessionStorage.clear();
console.log('Хранилище очищено');
