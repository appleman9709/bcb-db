// Конфигурация
const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
let currentFamilyId = null;
let historyChart = null;
let currentPeriod = 'today';
let updateTimer = null;
let nextUpdateTime = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Инициализация приложения
async function initializeApp() {
    try {
        // Инициализируем Telegram Web App
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            // Устанавливаем тему
            if (window.Telegram.WebApp.colorScheme === 'dark') {
                document.body.classList.add('dark-theme');
            }
        }
        
        // Загружаем список семей (автоматически выберет Коршиковых)
        await loadFamilies();
        
        // Добавляем обработчики для переключателя периодов
        setupPeriodSelector();
        
        // Добавляем обработчик для кнопки обновления
        setupRefreshButton();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка инициализации приложения');
    }
}

// Настройка переключателя периодов
function setupPeriodSelector() {
    const periodButtons = document.querySelectorAll('.period-btn');
    
    periodButtons.forEach(button => {
        button.addEventListener('click', async function() {
            // Убираем активный класс со всех кнопок
            periodButtons.forEach(btn => btn.classList.remove('active'));
            
            // Добавляем активный класс к нажатой кнопке
            this.classList.add('active');
            
            // Обновляем текущий период
            currentPeriod = this.dataset.period;
            
            // Перезагружаем дашборд с новым периодом
            if (currentFamilyId) {
                await loadDashboard(currentFamilyId);
            }
        });
    });
}

// Настройка кнопки обновления
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            // Добавляем анимацию вращения
            this.style.transform = 'rotate(360deg)';
            this.style.transition = 'transform 0.5s ease';
            
            // Обновляем данные
            if (currentFamilyId) {
                await loadDashboard(currentFamilyId);
                // Сбрасываем таймер обновления
                nextUpdateTime = new Date().getTime() + 300000;
            }
            
            // Убираем анимацию через 0.5 секунды
            setTimeout(() => {
                this.style.transform = 'rotate(0deg)';
            }, 500);
        });
    }
}

// Загрузка списка семей
async function loadFamilies() {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_BASE_URL}/families?_t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const familySelect = document.getElementById('familySelect');
        
        // Очищаем существующие опции
        familySelect.innerHTML = '<option value="">Выберите семью...</option>';
        
        // Добавляем семьи
        data.families.forEach(family => {
            const option = document.createElement('option');
            option.value = family.id;
            option.textContent = family.name;
            familySelect.appendChild(option);
        });
        
        // Автоматически выбираем семью "Коршиковы" или первую доступную
        let defaultFamilyId = null;
        const korchikovFamily = data.families.find(family => family.name.includes('Коршиковы') || family.name.includes('Коршиков'));
        if (korchikovFamily) {
            defaultFamilyId = korchikovFamily.id;
        } else if (data.families.length > 0) {
            defaultFamilyId = data.families[0].id;
        }
        
        if (defaultFamilyId) {
            familySelect.value = defaultFamilyId;
            await loadDashboard(defaultFamilyId);
        }
        
        // Добавляем обработчик изменения
        familySelect.addEventListener('change', async function() {
            if (this.value) {
                await loadDashboard(this.value);
            }
        });
        
    } catch (error) {
        console.error('Ошибка загрузки семей:', error);
        showError('Не удалось загрузить список семей');
    }
}

// Загрузка дашборда
async function loadDashboard(familyId) {
    try {
        // Проверяем, что ID семьи валидный
        if (!familyId || familyId === 'undefined' || familyId === '') {
            console.log('ID семьи не выбран, пропускаем загрузку дашборда');
            return;
        }
        
        showLoading();
        currentFamilyId = familyId;
        
        // Загружаем данные дашборда с учетом периода (с принудительным обновлением кэша)
        const timestamp = new Date().getTime();
        const dashboardResponse = await fetch(`${API_BASE_URL}/family/${familyId}/dashboard?period=${currentPeriod}&_t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        if (!dashboardResponse.ok) {
            throw new Error(`HTTP error! status: ${dashboardResponse.status}`);
        }
        
        const dashboardData = await dashboardResponse.json();
        
        // Отладочная информация
        console.log('📊 Данные дашборда:', dashboardData);
        console.log('📈 Статистика:', dashboardData.today_stats);
        console.log('🕐 Последние события:', dashboardData.last_events);
        
        // Загружаем историю в зависимости от выбранного периода
        let days = 1; // по умолчанию сегодня
        if (currentPeriod === 'week') {
            days = 7;
        } else if (currentPeriod === 'month') {
            days = 30;
        }
        
        const historyResponse = await fetch(`${API_BASE_URL}/family/${familyId}/history?days=${days}&_t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        if (!historyResponse.ok) {
            throw new Error(`HTTP error! status: ${historyResponse.status}`);
        }
        
        const historyData = await historyResponse.json();
        
        // Загружаем членов семьи
        const membersResponse = await fetch(`${API_BASE_URL}/family/${familyId}/members?_t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        if (!membersResponse.ok) {
            throw new Error(`HTTP error! status: ${membersResponse.status}`);
        }
        
        const membersData = await membersResponse.json();
        
        // Отображаем данные
        displayDashboard(dashboardData);
        displayHistory(historyData);
        displayMembers(membersData);
        
        hideLoading();
        showDashboard();
        
    } catch (error) {
        console.error('Ошибка загрузки дашборда:', error);
        hideLoading();
        showError('Не удалось загрузить данные дашборда');
    }
}

// Отображение дашборда
function displayDashboard(data) {
    // Информация о семье
    document.getElementById('familyName').textContent = data.family.name;
    
    const babyAge = data.settings.baby_age_months;
    document.getElementById('babyAge').textContent = `Возраст: ${babyAge} мес.`;
    
    if (data.settings.baby_birth_date) {
        const birthDate = new Date(data.settings.baby_birth_date);
        document.getElementById('babyBirthDate').textContent = 
            `Родился: ${birthDate.toLocaleDateString('ru-RU')}`;
    } else {
        document.getElementById('babyBirthDate').textContent = '';
    }
    
    // Статистика за выбранный период
    document.getElementById('todayFeedings').textContent = data.today_stats.feedings;
    document.getElementById('todayDiapers').textContent = data.today_stats.diapers;
    document.getElementById('todayBaths').textContent = data.today_stats.baths;
    document.getElementById('todayActivities').textContent = data.today_stats.activities;
    
    // Настройки
    displaySettings(data.settings);
    
    // Последние события
    displayLastEvent('feeding', data.last_events.feeding, data.settings.feed_interval);
    displayLastEvent('diaper', data.last_events.diaper, data.settings.diaper_interval);
    displayLastEvent('bath', data.last_events.bath, null);
    displayLastEvent('activity', data.last_events.activity, null);
    
    // Сон
    displaySleep(data.sleep);
}

// Отображение последнего события
function displayLastEvent(type, event, interval) {
    const timeElement = document.getElementById(`last${type.charAt(0).toUpperCase() + type.slice(1)}Time`);
    const authorElement = document.getElementById(`last${type.charAt(0).toUpperCase() + type.slice(1)}Author`);
    const statusElement = document.getElementById(`${type}Status`);
    
    if (event.timestamp) {
        const eventTime = new Date(event.timestamp);
        timeElement.textContent = formatTime(eventTime);
        
        if (event.author_role && event.author_name) {
            authorElement.textContent = `${event.author_role} ${event.author_name}`;
        } else {
            authorElement.textContent = '';
        }
        
        // Определяем статус для кормления и подгузников
        if (interval && event.time_ago) {
            const hoursAgo = event.time_ago.hours + event.time_ago.minutes / 60;
            
            if (hoursAgo < interval) {
                statusElement.textContent = '✅ Хорошо';
                statusElement.className = 'event-status good';
            } else if (hoursAgo < interval + 0.5) {
                statusElement.textContent = '⚠️ Пора';
                statusElement.className = 'event-status warning';
            } else {
                statusElement.textContent = '🚨 Долго';
                statusElement.className = 'event-status danger';
            }
        } else {
            statusElement.textContent = '';
            statusElement.className = 'event-status';
        }
    } else {
        timeElement.textContent = 'Нет данных';
        authorElement.textContent = '';
        statusElement.textContent = '';
        statusElement.className = 'event-status';
    }
}

// Отображение сна
function displaySleep(sleepData) {
    const statusElement = document.getElementById('sleepStatus');
    const durationElement = document.getElementById('sleepDuration');
    const authorElement = document.getElementById('sleepAuthor');
    
    if (sleepData.is_active) {
        statusElement.textContent = 'Малыш спит';
        
        if (sleepData.duration) {
            const { hours, minutes } = sleepData.duration;
            durationElement.textContent = `Длительность: ${hours}ч ${minutes}м`;
        } else {
            durationElement.textContent = '';
        }
        
        if (sleepData.author_role && sleepData.author_name) {
            authorElement.textContent = `Уложил: ${sleepData.author_role} ${sleepData.author_name}`;
        } else {
            authorElement.textContent = '';
        }
    } else {
        statusElement.textContent = 'Малыш не спит';
        durationElement.textContent = '';
        authorElement.textContent = '';
    }
}

// Отображение истории
function displayHistory(data) {
    if (historyChart) {
        historyChart.destroy();
    }
    
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    const labels = data.history.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    });
    
    const feedingsData = data.history.map(item => item.feedings);
    const diapersData = data.history.map(item => item.diapers);
    const bathsData = data.history.map(item => item.baths);
    const activitiesData = data.history.map(item => item.activities);
    
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Кормления',
                    data: feedingsData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Подгузники',
                    data: diapersData,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Купания',
                    data: bathsData,
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(240, 147, 251, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Активности',
                    data: activitiesData,
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        }
    });
}

// Отображение членов семьи
function displayMembers(data) {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';
    
    data.members.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        
        memberCard.innerHTML = `
            <div class="member-role">${member.role}</div>
            <div class="member-name">${member.name}</div>
        `;
        
        membersList.appendChild(memberCard);
    });
}

// Форматирование времени
function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} д. назад`;
    } else if (hours > 0) {
        return `${hours} ч. назад`;
    } else if (minutes > 0) {
        return `${minutes} мин. назад`;
    } else {
        return 'Только что';
    }
}

// Показать загрузку
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
}

// Скрыть загрузку
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Показать дашборд
function showDashboard() {
    document.getElementById('dashboard').classList.remove('hidden');
}

// Показать ошибку
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// Функция для обновления таймера
function updateTimerDisplay() {
    if (nextUpdateTime) {
        const now = new Date().getTime();
        const timeLeft = Math.max(0, nextUpdateTime - now);
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        // Обновляем отображение таймера (если элемент существует)
        const timerElement = document.getElementById('updateTimer');
        if (timerElement) {
            timerElement.textContent = `Следующее обновление: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

// Автообновление данных каждые 5 минут
function startAutoUpdate() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    
    updateTimer = setInterval(() => {
        if (currentFamilyId && currentFamilyId !== 'undefined' && currentFamilyId !== '') {
            loadDashboard(currentFamilyId);
            nextUpdateTime = new Date().getTime() + 300000; // 5 минут
        }
    }, 300000); // 5 минут = 300000 миллисекунд
    
    // Устанавливаем время следующего обновления
    nextUpdateTime = new Date().getTime() + 300000;
    
    // Обновляем таймер каждую секунду
    setInterval(updateTimerDisplay, 1000);
}

// Запускаем автообновление
startAutoUpdate();

// Обработка ошибок сети
window.addEventListener('online', () => {
    if (currentFamilyId) {
        loadDashboard(currentFamilyId);
    }
});

window.addEventListener('offline', () => {
    showError('Нет подключения к интернету');
});

// Отображение настроек
function displaySettings(settings) {
    // Интервал кормления
    const feedInterval = settings.feed_interval || 3;
    document.getElementById('feedInterval').textContent = `${feedInterval} часа`;
    
    // Интервал подгузников
    const diaperInterval = settings.diaper_interval || 2;
    document.getElementById('diaperInterval').textContent = `${diaperInterval} часа`;
    
    // Напоминания о купании
    const bathReminders = settings.bath_reminder_enabled ? 'Включены' : 'Выключены';
    document.getElementById('bathReminders').textContent = bathReminders;
    
    // Напоминания об активности
    const activityReminders = settings.activity_reminder_enabled ? 'Включены' : 'Выключены';
    document.getElementById('activityReminders').textContent = activityReminders;
}
