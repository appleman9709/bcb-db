import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Полифилл для AbortSignal.timeout() для поддержки старых браузеров
function createTimeoutSignal(timeout: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeout)
  }
  
  // Fallback для старых браузеров
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  // Добавляем обработчик для очистки таймаута
  const signal = controller.signal as any
  signal.addEventListener('abort', () => clearTimeout(timeoutId))
  
  return signal
}

// Создаем клиент с оптимизированными настройками для предотвращения "засыпания" БД
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'babycare-dashboard/1.0',
    },
    // Таймаут для запросов (30 секунд)
    fetch: (url, options = {}) => {
      // Если уже есть signal, используем его, иначе создаем таймаут
      const signal = options.signal || createTimeoutSignal(30000)

      return fetch(url, {
        ...options,
        signal,
      }).catch((error) => {
        // При ошибке таймаута, пробуем еще раз с меньшим таймаутом
        if ((error.name === 'TimeoutError' || error.name === 'AbortError') && !options.signal) {
          console.warn('Database request timeout, retrying with shorter timeout...')
          const retrySignal = createTimeoutSignal(10000) // Повторная попытка с 10 секундами
          
          return fetch(url, {
            ...options,
            signal: retrySignal,
          })
        }
        throw error
      })
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Keep-alive механизм для поддержания соединения активным
class DatabaseKeepAlive {
  private intervalId: number | null = null
  private lastCheckTime: number = 0
  private readonly CHECK_INTERVAL = 5 * 60 * 1000 // Проверка каждые 5 минут
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000 // 30 минут неактивности

  constructor(private client: SupabaseClient) {
    // Начинаем проверку при создании
    this.start()
  }

  private async performKeepAliveCheck(): Promise<void> {
    try {
      // Простой запрос для проверки соединения
      // Используем минимальный запрос к системной таблице
      // Таймаут обрабатывается на уровне fetch в конфигурации клиента
      const { error } = await this.client
        .from('families')
        .select('id')
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        // PGRST116 - это "not found", это нормально для keep-alive
        // Другие ошибки логируем только при необходимости
        if (!error.message.includes('timeout') && !error.message.includes('aborted')) {
          console.warn('Keep-alive check failed:', error.message)
        }
      } else {
        this.lastCheckTime = Date.now()
      }
    } catch (error: any) {
      // Игнорируем ошибки keep-alive, чтобы не засорять консоль
      if (error instanceof Error && 
          !error.message.includes('aborted') && 
          !error.message.includes('timeout')) {
        console.warn('Keep-alive error (non-critical):', error.message)
      }
    }
  }

  public start(): void {
    if (this.intervalId !== null) {
      return // Уже запущен
    }

    // Первая проверка сразу
    this.performKeepAliveCheck()

    // Затем проверяем периодически
    this.intervalId = window.setInterval(() => {
      const timeSinceLastCheck = Date.now() - this.lastCheckTime
      
      // Проверяем только если прошло достаточно времени с последней проверки
      if (timeSinceLastCheck >= this.CHECK_INTERVAL) {
        this.performKeepAliveCheck()
      }
    }, this.CHECK_INTERVAL)

    // Также слушаем события видимости страницы
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Когда страница становится видимой, проверяем соединение
        const timeSinceLastCheck = Date.now() - this.lastCheckTime
        if (timeSinceLastCheck >= this.IDLE_TIMEOUT) {
          this.performKeepAliveCheck()
        }
      }
    })
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // Принудительная проверка соединения
  public async checkConnection(): Promise<boolean> {
    try {
      await this.performKeepAliveCheck()
      return true
    } catch {
      return false
    }
  }
}

// Создаем экземпляр keep-alive только в браузере
let keepAliveInstance: DatabaseKeepAlive | null = null

if (typeof window !== 'undefined') {
  keepAliveInstance = new DatabaseKeepAlive(supabase)
  
  // Экспортируем функцию для принудительной проверки соединения
  ;(window as any).checkDatabaseConnection = () => {
    return keepAliveInstance?.checkConnection() ?? Promise.resolve(false)
  }
}

// Функция для предварительной проверки соединения при загрузке приложения
export async function prewarmConnection(): Promise<void> {
  try {
    // Выполняем легкий запрос для "разогрева" соединения
    // Таймаут обрабатывается на уровне fetch в конфигурации клиента
    const { error } = await supabase
      .from('families')
      .select('id')
      .limit(1)
    
    if (error && error.code !== 'PGRST116') {
      // Игнорируем ошибки, которые не критичны для предварительной проверки
      console.warn('Database prewarm completed with warning:', error.message)
    } else {
      console.log('Database connection prewarmed successfully')
    }
  } catch (error: any) {
    // Игнорируем ошибки предварительной проверки (не критично)
    if (!error?.message?.includes('timeout') && !error?.message?.includes('aborted')) {
      console.warn('Database prewarm failed (non-critical):', error?.message)
    }
  }
}
