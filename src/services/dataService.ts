import { supabase } from '../lib/supabaseClient'

export interface Family {
  id: number
  name: string
  created_at: string
}

export interface FamilyMember {
  family_id: number
  user_id: string
  role: string | null
  name: string | null
  created_at: string
}

export interface Feeding {
  id: number
  family_id: number
  author_id: string
  timestamp: string
  author_role: string
  author_name: string
  ounces?: number
  created_at: string
}

export interface Diaper {
  id: number
  family_id: number
  author_id: string
  timestamp: string
  author_role: string
  author_name: string
  diaper_type?: string
  created_at: string
}

export interface Bath {
  id: number
  family_id: number
  author_id: string
  timestamp: string
  author_role: string
  author_name: string
  bath_mood?: string
  created_at: string
}

export interface Activity {
  id: number
  family_id: number
  author_id: string
  timestamp: string
  activity_type: string
  author_role: string
  author_name: string
  created_at: string
}

export interface SleepSession {
  id: number
  family_id: number
  author_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  author_role: string
  author_name: string
  created_at: string
  video_played?: boolean
}

export interface Settings {
  family_id: number
  feed_interval: number
  diaper_interval: number
  tips_enabled: boolean
  tips_time_hour: number
  tips_time_minute: number
  bath_reminder_enabled: boolean
  bath_reminder_hour: number
  bath_reminder_minute: number
  bath_reminder_period: number
  activity_reminder_enabled: boolean
  activity_reminder_interval: number
  sleep_monitoring_enabled: boolean
  wake_on_activity_enabled: boolean
  baby_age_months: number
  baby_birth_date?: string
  birth_date?: string
  created_at: string
  updated_at: string
}

export interface Tip {
  id: number
  age_months: number
  content: string
  category: string
  created_at: string
}

export interface ParentCoins {
  id: number
  family_id: number
  user_id: string
  feeding_coins: number
  diaper_coins: number
  bath_coins: number
  activity_coins: number
  mom_coins: number
  sleep_coins: number
  total_score: number
  created_at: string
  updated_at: string
}

export interface TetrisRecord {
  id: number
  family_id: number
  user_id: string
  player_name: string
  score: number
  level: number
  lines_cleared: number
  game_duration_seconds: number
  pieces_placed: number
  game_mode: string
  created_at: string
}

export interface TetrisRecordWithRank extends TetrisRecord {
  rank: number
}

type AuthorContext = {
  authorId: string
  authorName: string
  authorRole: string
}

class DataService {
  private familyId: number | null = null
  private authorId: string | null = null
  private authorName: string | null = null
  private authorRole: string | null = null

  configure(options: {
    familyId: number | null
    authorId: string | null
    authorName?: string | null
    authorRole?: string | null
  }) {
    this.familyId = options.familyId ?? null
    this.authorId = options.authorId ?? null
    this.authorName = options.authorName ?? null
    this.authorRole = options.authorRole ?? null
  }

  private requireFamilyId(): number {
    if (this.familyId === null) {
      throw new Error('Family context is not configured')
    }

    return this.familyId
  }

  private requireAuthor(): AuthorContext {
    if (!this.authorId) {
      throw new Error('Author context is not configured')
    }

    return {
      authorId: this.authorId,
      authorName: this.authorName?.trim() || 'Family member',
      authorRole: this.authorRole?.trim() || 'Family member'
    }
  }

  // Family operations
  async getFamily(): Promise<Family | null> {
    try {
      const familyId = this.requireFamilyId()

      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single()

      if (error) {
        console.error('Error fetching family', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Family context is not configured', error)
      return null
    }
  }

  // Feeding operations
  async getFeedings(limit: number = 10): Promise<Feeding[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('feedings')
      .select('*')
      .eq('family_id', familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching feedings', error)
      return []
    }

    return data || []
  }

  async getLastFeeding(): Promise<Feeding | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('feedings')
      .select('*')
      .eq('family_id', familyId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      console.error('Error fetching last feeding', error)
      return null
    }

    return data
  }

  async addFeeding(timestamp?: string, ounces?: number): Promise<Feeding | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName, authorRole } = this.requireAuthor()

    let eventDate = timestamp ? new Date(timestamp) : new Date()

    if (Number.isNaN(eventDate.getTime())) {
      eventDate = new Date()
    }

    const { data, error } = await supabase
      .from('feedings')
      .insert({
        family_id: familyId,
        author_id: authorId,
        timestamp: eventDate.toISOString(),
        author_role: authorRole,
        author_name: authorName,
        ounces: ounces || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding feeding', error)
      return null
    }

    // Запись активности для пробуждения обрабатывается на сервере (триггеры БД)

    return data
  }

  async deleteFeeding(id: number): Promise<boolean> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { error } = await supabase
      .from('feedings')
      .delete()
      .eq('id', id)
      .eq('family_id', familyId)
      .eq('author_id', authorId)

    if (error) {
      console.error('Error deleting feeding', error)
      return false
    }

    return true
  }

  // Diaper operations
  async getDiapers(limit: number = 10): Promise<Diaper[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('diapers')
      .select('*')
      .eq('family_id', familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching diapers', error)
      return []
    }

    return data || []
  }

  async getLastDiaper(): Promise<Diaper | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('diapers')
      .select('*')
      .eq('family_id', familyId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      console.error('Error fetching last diaper', error)
      return null
    }

    return data
  }

  async addDiaper(timestamp?: string, diaperType?: string): Promise<Diaper | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName, authorRole } = this.requireAuthor()

    let eventDate = timestamp ? new Date(timestamp) : new Date()

    if (Number.isNaN(eventDate.getTime())) {
      eventDate = new Date()
    }

    const { data, error } = await supabase
      .from('diapers')
      .insert({
        family_id: familyId,
        author_id: authorId,
        timestamp: eventDate.toISOString(),
        author_role: authorRole,
        author_name: authorName,
        diaper_type: diaperType || 'Просто'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding diaper', error)
      return null
    }

    // Запись активности для пробуждения обрабатывается на сервере (триггеры БД)

    return data
  }

  async deleteDiaper(id: number): Promise<boolean> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { error } = await supabase
      .from('diapers')
      .delete()
      .eq('id', id)
      .eq('family_id', familyId)
      .eq('author_id', authorId)

    if (error) {
      console.error('Error deleting diaper', error)
      return false
    }

    return true
  }

  // Bath operations
  async getBaths(limit: number = 10): Promise<Bath[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('baths')
      .select('*')
      .eq('family_id', familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching baths', error)
      return []
    }

    return data || []
  }

  async getLastBath(): Promise<Bath | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('baths')
      .select('*')
      .eq('family_id', familyId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      console.error('Error fetching last bath', error)
      return null
    }

    return data
  }

  async addBath(timestamp?: string, bathMood?: string): Promise<Bath | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName, authorRole } = this.requireAuthor()

    let eventDate = timestamp ? new Date(timestamp) : new Date()

    if (Number.isNaN(eventDate.getTime())) {
      eventDate = new Date()
    }

    const { data, error } = await supabase
      .from('baths')
      .insert({
        family_id: familyId,
        author_id: authorId,
        timestamp: eventDate.toISOString(),
        author_role: authorRole,
        author_name: authorName,
        bath_mood: bathMood || 'Спокойное купание'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding bath', error)
      return null
    }

    // Запись активности для пробуждения обрабатывается на сервере (триггеры БД)

    return data
  }

  async deleteBath(id: number): Promise<boolean> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { error } = await supabase
      .from('baths')
      .delete()
      .eq('id', id)
      .eq('family_id', familyId)
      .eq('author_id', authorId)

    if (error) {
      console.error('Error deleting bath', error)
      return false
    }

    return true
  }

  // Activity operations
  async getActivities(limit: number = 10): Promise<Activity[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('family_id', familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching activities', error)
      return []
    }

    return data || []
  }

  async addActivity(activityType: string = 'activity'): Promise<Activity | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName, authorRole } = this.requireAuthor()

    const { data, error } = await supabase
      .from('activities')
      .insert({
        family_id: familyId,
        author_id: authorId,
        timestamp: new Date().toISOString(),
        activity_type: activityType,
        author_role: authorRole,
        author_name: authorName
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding activity', error)
      return null
    }

    return data
  }

  async deleteActivity(id: number): Promise<boolean> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)
      .eq('family_id', familyId)
      .eq('author_id', authorId)

    if (error) {
      console.error('Error deleting activity', error)
      return false
    }

    return true
  }

  // Sleep operations
  async getSleepSessions(limit: number = 10): Promise<SleepSession[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('family_id', familyId)
      .order('start_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching sleep sessions', error)
      return []
    }

    return data || []
  }

  async getCurrentSleepSession(): Promise<SleepSession | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('family_id', familyId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      console.error('Error fetching current sleep session', error)
      return null
    }

    return data
  }

  async startSleepSession(): Promise<SleepSession | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName, authorRole } = this.requireAuthor()

    // Проверяем, есть ли уже активная сессия сна
    const currentSession = await this.getCurrentSleepSession()
    if (currentSession) {
      console.log('Sleep session already active')
      return currentSession
    }

    const { data, error } = await supabase
      .from('sleep_sessions')
      .insert({
        family_id: familyId,
        author_id: authorId,
        start_time: new Date().toISOString(),
        author_role: authorRole,
        author_name: authorName
      })
      .select()
      .single()

    if (error) {
      console.error('Error starting sleep session', error)
      return null
    }

    return data
  }

  async endSleepSession(): Promise<SleepSession | null> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    // Находим активную сессию сна
    const currentSession = await this.getCurrentSleepSession()
    if (!currentSession) {
      console.log('No active sleep session to end')
      return null
    }

    const endTime = new Date()
    const startTime = new Date(currentSession.start_time)
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))

    const { data, error } = await supabase
      .from('sleep_sessions')
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes
      })
      .eq('id', currentSession.id)
      .eq('family_id', familyId)
      .eq('author_id', authorId)
      .select()
      .single()

    if (error) {
      console.error('Error ending sleep session', error)
      return null
    }

    return data
  }

  async deleteSleepSession(id: number): Promise<boolean> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { error } = await supabase
      .from('sleep_sessions')
      .delete()
      .eq('id', id)
      .eq('family_id', familyId)
      .eq('author_id', authorId)

    if (error) {
      console.error('Error deleting sleep session', error)
      return false
    }

    return true
  }

  async getFamilySleepStatus(): Promise<{ isSleeping: boolean; sleepSession: SleepSession | null }> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('family_id', familyId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { isSleeping: false, sleepSession: null }
      }

      console.error('Error fetching family sleep status', error)
      return { isSleeping: false, sleepSession: null }
    }

    return { isSleeping: true, sleepSession: data }
  }

  async markSleepVideoAsPlayed(): Promise<boolean> {
    const familyId = this.requireFamilyId()

    // Получаем текущую активную сессию сна
    const currentSession = await this.getCurrentSleepSession()
    if (!currentSession) {
      return false
    }

    const { error } = await supabase
      .from('sleep_sessions')
      .update({ video_played: true })
      .eq('id', currentSession.id)

    if (error) {
      console.error('Error marking sleep video as played', error)
      return false
    }

    return true
  }

  async getSleepVideoPlayedState(): Promise<boolean> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('video_played')
      .eq('family_id', familyId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error getting sleep video state', error)
      return false
    }

    return data?.video_played || false
  }

  // Tips operations
  async getTips(ageMonths?: number): Promise<Tip[]> {
    let query = supabase
      .from('tips')
      .select('*')
      .order('created_at', { ascending: false })

    if (ageMonths !== undefined) {
      query = query.eq('age_months', ageMonths)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tips', error)
      return []
    }

    return data || []
  }

  async getRandomTip(ageMonths?: number): Promise<Tip | null> {
    const tips = await this.getTips(ageMonths)
    if (tips.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * tips.length)
    return tips[randomIndex]
  }

  // Settings operations
  async getSettings(): Promise<Settings | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('family_id', familyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      console.error('Error fetching settings', error)
      return null
    }

    return data
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('settings')
      .upsert({
        family_id: familyId,
        ...settings
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating settings', error)
      return null
    }

    return data
  }

  // Statistics
  async getTodayStats() {
    this.requireFamilyId()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [feedings, diapers, baths, activities] = await Promise.all([
      this.getFeedings(50),
      this.getDiapers(50),
      this.getBaths(50),
      this.getActivities(50)
    ])

    const todayFeedings = feedings.filter(item => {
      const date = new Date(item.timestamp)
      return date >= today && date < tomorrow
    })

    const todayDiapers = diapers.filter(item => {
      const date = new Date(item.timestamp)
      return date >= today && date < tomorrow
    })

    const todayBaths = baths.filter(item => {
      const date = new Date(item.timestamp)
      return date >= today && date < tomorrow
    })

    const todayActivities = activities.filter(item => {
      const date = new Date(item.timestamp)
      return date >= today && date < tomorrow
    })

    return {
      feedings: todayFeedings.length,
      diapers: todayDiapers.length,
      baths: todayBaths.length,
      activities: todayActivities.length
    }
  }

  // Get total counts for all events
  async getTotalCounts() {
    const familyId = this.requireFamilyId()

    const [feedingsCount, diapersCount, bathsCount, activitiesCount] = await Promise.all([
      supabase
        .from('feedings')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId),
      supabase
        .from('diapers')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId),
      supabase
        .from('baths')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId),
      supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
    ])

    return {
      feedings: feedingsCount.count || 0,
      diapers: diapersCount.count || 0,
      baths: bathsCount.count || 0,
      activities: activitiesCount.count || 0
    }
  }

  // Parent coins operations
  async getParentCoins(): Promise<ParentCoins | null> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { data, error } = await supabase
      .from('parent_coins')
      .select('*')
      .eq('family_id', familyId)
      .eq('user_id', authorId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      console.error('Error fetching parent coins', error)
      return null
    }

    return data
  }

  async updateParentCoins(coins: {
    feeding_coins?: number
    diaper_coins?: number
    bath_coins?: number
    activity_coins?: number
    mom_coins?: number
    sleep_coins?: number
    total_score?: number
  }): Promise<ParentCoins | null> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    // Сначала получаем текущие данные
    const currentCoins = await this.getParentCoins()
    
    const coinsData = {
      family_id: familyId,
      user_id: authorId,
      feeding_coins: coins.feeding_coins ?? currentCoins?.feeding_coins ?? 0,
      diaper_coins: coins.diaper_coins ?? currentCoins?.diaper_coins ?? 0,
      bath_coins: coins.bath_coins ?? currentCoins?.bath_coins ?? 0,
      activity_coins: coins.activity_coins ?? currentCoins?.activity_coins ?? 0,
      mom_coins: coins.mom_coins ?? currentCoins?.mom_coins ?? 0,
      sleep_coins: coins.sleep_coins ?? currentCoins?.sleep_coins ?? 0,
      total_score: coins.total_score ?? currentCoins?.total_score ?? 0
    }

    console.log('DataService: Upserting coins data:', coinsData)
    const { data, error } = await supabase
      .from('parent_coins')
      .upsert(coinsData, { 
        onConflict: 'family_id,user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating parent coins', error)
      return null
    }

    console.log('DataService: Upsert successful:', data)

    return data
  }

  async addCoins(coinType: 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'activity_coins' | 'mom_coins' | 'sleep_coins', amount: number = 1): Promise<ParentCoins | null> {
    console.log(`DataService: Adding ${amount} ${coinType} coins`)
    const currentCoins = await this.getParentCoins()
    console.log('DataService: Current coins:', currentCoins)
    
    if (!currentCoins) {
      // Создаем новую запись
      const newCoins = {
        feeding_coins: coinType === 'feeding_coins' ? amount : 0,
        diaper_coins: coinType === 'diaper_coins' ? amount : 0,
        bath_coins: coinType === 'bath_coins' ? amount : 0,
        activity_coins: coinType === 'activity_coins' ? amount : 0,
        mom_coins: coinType === 'mom_coins' ? amount : 0,
        sleep_coins: coinType === 'sleep_coins' ? amount : 0,
        total_score: amount * 1 // Каждая монетка дает 1 очко
      }
      console.log('DataService: Creating new coins record:', newCoins)
      return await this.updateParentCoins(newCoins)
    }

    // Обновляем существующую запись
    const updatedCoins = {
      feeding_coins: coinType === 'feeding_coins' ? currentCoins.feeding_coins + amount : currentCoins.feeding_coins,
      diaper_coins: coinType === 'diaper_coins' ? currentCoins.diaper_coins + amount : currentCoins.diaper_coins,
      bath_coins: coinType === 'bath_coins' ? currentCoins.bath_coins + amount : currentCoins.bath_coins,
      activity_coins: coinType === 'activity_coins' ? (currentCoins.activity_coins || 0) + amount : (currentCoins.activity_coins || 0),
      mom_coins: coinType === 'mom_coins' ? currentCoins.mom_coins + amount : currentCoins.mom_coins,
      sleep_coins: coinType === 'sleep_coins' ? (currentCoins.sleep_coins || 0) + amount : (currentCoins.sleep_coins || 0),
      total_score: currentCoins.total_score + (amount * 1)
    }
    console.log('DataService: Updating coins record:', updatedCoins)

    return await this.updateParentCoins(updatedCoins)
  }

  // Tetris records operations
  async getFamilyTetrisRecords(limit: number = 10): Promise<TetrisRecordWithRank[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .rpc('get_family_tetris_records', {
        family_id_param: familyId,
        limit_count: limit
      })

    if (error) {
      console.error('Error fetching family tetris records', error)
      return []
    }

    return data || []
  }

  async getUserTetrisRecords(limit: number = 10): Promise<TetrisRecordWithRank[]> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { data, error } = await supabase
      .rpc('get_user_tetris_records', {
        family_id_param: familyId,
        user_id_param: authorId,
        limit_count: limit
      })

    if (error) {
      console.error('Error fetching user tetris records', error)
      return []
    }

    return data || []
  }

  async addTetrisRecord(record: {
    player_name: string
    score: number
    level: number
    lines_cleared: number
    game_duration_seconds: number
    pieces_placed: number
    game_mode?: string
  }): Promise<TetrisRecord | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName } = this.requireAuthor()

    const { data, error } = await supabase
      .from('tetris_records')
      .insert({
        family_id: familyId,
        user_id: authorId,
        player_name: record.player_name || authorName,
        score: record.score,
        level: record.level,
        lines_cleared: record.lines_cleared,
        game_duration_seconds: record.game_duration_seconds,
        pieces_placed: record.pieces_placed,
        game_mode: record.game_mode || 'classic'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding tetris record', error)
      return null
    }

    return data
  }

  async getTetrisRecordRank(score: number): Promise<number> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('tetris_records')
      .select('score')
      .eq('family_id', familyId)
      .gte('score', score)
      .order('score', { ascending: false })

    if (error) {
      console.error('Error getting tetris record rank', error)
      return 0
    }

    return data ? data.length : 0
  }

  async getFamilyBestTetrisRecord(): Promise<TetrisRecord | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .rpc('get_family_best_tetris_record', {
        family_id_param: familyId
      })

    if (error) {
      console.error('Error fetching family best tetris record', error)
      return null
    }

    return data && data.length > 0 ? data[0] : null
  }
}

export const dataService = new DataService()
