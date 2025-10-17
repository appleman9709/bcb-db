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


export interface FamilyInventory {
  family_id: number
  diapers_stock: number
  formula_grams: number
  formula_portions: number
  portion_size_ounces: number
  updated_by?: string | number | null
  created_at?: string
  updated_at?: string
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

export interface DutySchedule {
  id?: number
  family_id: number
  block_duration_hours: number
  start_hour_offset: number
  updated_by?: string
  created_at?: string
  updated_at?: string
}

export interface DutyAssignment {
  id?: number
  family_id: number
  block_id: string
  parent_id?: string
  created_at?: string
  updated_at?: string
}

export interface DutyScheduleWithAssignments extends DutySchedule {
  assignments: DutyAssignment[]
}

export interface GrowthMeasurement {
  id: number
  family_id: number
  user_id: string
  measurement_type: 'height' | 'weight'
  month: number
  value: number
  recorded_by?: string
  created_at: string
  updated_at: string
}

type AuthorContext = {
  authorId: string
  authorName: string
  authorRole: string
}

export const GRAMS_PER_OUNCE = 4.37

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

  async getFamilyMembers(): Promise<FamilyMember[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('family_members')
      .select('family_id, user_id, role, name, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching family members', error)
      return []
    }

    return (data ?? []).map(member => ({
      ...member,
      user_id: String(member.user_id)
    }))
  }

  // Inventory operations
  async getFamilyInventory(): Promise<FamilyInventory | null> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('family_inventory')
      .select('*')
      .eq('family_id', familyId)
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      console.error('Error fetching family inventory', error)
      return null
    }

    return data
  }

  private async upsertFamilyInventory(values: {
    diapers_stock: number
    formula_grams: number
    formula_portions: number
    portion_size_ounces?: number
  }): Promise<FamilyInventory | null> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const payload = {
      family_id: familyId,
      diapers_stock: Math.max(0, Math.round(values.diapers_stock)),
      formula_grams: Number(values.formula_grams.toFixed(3)),
      formula_portions: Number(values.formula_portions.toFixed(3)),
      portion_size_ounces: values.portion_size_ounces ? Number(values.portion_size_ounces.toFixed(1)) : undefined,
      updated_by: authorId || null
    }

    const { data, error } = await supabase
      .from('family_inventory')
      .upsert(payload, {
        onConflict: 'family_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating family inventory', error)
      return null
    }

    return data
  }

  async adjustFamilyInventory(deltas: {
    diapersDelta?: number
    formulaGramsDelta?: number
    formulaPortionsDelta?: number
  }): Promise<FamilyInventory | null> {
    const current = await this.getFamilyInventory()

    const currentDiapers = current?.diapers_stock ?? 0
    const currentGrams = current?.formula_grams ?? 0
    const currentPortions =
      current?.formula_portions ?? (currentGrams > 0 ? currentGrams / GRAMS_PER_OUNCE : 0)

    const nextDiapers = Math.max(0, currentDiapers + (deltas.diapersDelta ?? 0))
    const nextGrams = Math.max(0, currentGrams + (deltas.formulaGramsDelta ?? 0))

    const portionsDelta =
      deltas.formulaPortionsDelta !== undefined
        ? deltas.formulaPortionsDelta
        : (deltas.formulaGramsDelta ?? 0) / GRAMS_PER_OUNCE
    const nextPortions = Math.max(0, currentPortions + portionsDelta)

    console.log('Inventory adjustment:', {
      current: { diapers: currentDiapers, grams: currentGrams, portions: currentPortions },
      deltas,
      next: { diapers: nextDiapers, grams: nextGrams, portions: nextPortions }
    })

    return this.upsertFamilyInventory({
      diapers_stock: nextDiapers,
      formula_grams: nextGrams,
      formula_portions: nextPortions
    })
  }

  async restockInventory(options: { diapers?: number; formulaGrams?: number; portionSizeGrams?: number }): Promise<FamilyInventory | null> {
    const diapersToAdd = options.diapers ?? 0
    const gramsToAdd = options.formulaGrams ?? 0
    const portionSizeGrams = options.portionSizeGrams ?? GRAMS_PER_OUNCE

    if (diapersToAdd === 0 && gramsToAdd === 0) {
      return this.getFamilyInventory()
    }

    // Получаем текущий инвентарь
    const currentInventory = await this.getFamilyInventory()
    if (!currentInventory) {
      console.error('No family inventory found')
      return null
    }

    // Вычисляем новые значения
    const newDiapers = Math.max(0, currentInventory.diapers_stock + diapersToAdd)
    const newGrams = Math.max(0, currentInventory.formula_grams + gramsToAdd)
    const newPortions = newGrams / portionSizeGrams

    // Обновляем инвентарь с новым размером порции
    return this.upsertFamilyInventory({
      diapers_stock: newDiapers,
      formula_grams: newGrams,
      formula_portions: newPortions,
      portion_size_ounces: portionSizeGrams / GRAMS_PER_OUNCE
    })
  }

  async updatePortionSize(portionSizeOunces: number): Promise<FamilyInventory | null> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    // Получаем текущий инвентарь
    const currentInventory = await this.getFamilyInventory()
    if (!currentInventory) {
      console.error('No family inventory found')
      return null
    }

    // Пересчитываем количество порций с новым размером
    const newPortions = currentInventory.formula_grams / (portionSizeOunces * GRAMS_PER_OUNCE)

    const payload = {
      family_id: familyId,
      diapers_stock: currentInventory.diapers_stock,
      formula_grams: currentInventory.formula_grams,
      formula_portions: Number(newPortions.toFixed(3)),
      portion_size_ounces: Number(portionSizeOunces.toFixed(1)),
      updated_by: authorId || null
    }

    const { data, error } = await supabase
      .from('family_inventory')
      .upsert(payload, {
        onConflict: 'family_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating portion size', error)
      return null
    }

    return data
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

    // Всегда списываем смесь при кормлении, даже если унции не указаны
    // Используем стандартную порцию в 1 унцию, если унции не указаны
    const consumedOunces = typeof ounces === 'number' && ounces > 0 ? ounces : 1
    const gramsToSubtract = consumedOunces * GRAMS_PER_OUNCE

    try {
      await this.adjustFamilyInventory({
        formulaGramsDelta: -gramsToSubtract,
        formulaPortionsDelta: -consumedOunces
      })
      console.log(`Feeding recorded: ${consumedOunces} ounces (${gramsToSubtract}g) deducted from inventory`)
    } catch (inventoryError) {
      console.error('Error updating inventory after feeding', inventoryError)
    }

    // Прерываем сон при кормлении (если есть активные сессии)
    try {
      await this.endAllActiveSleepSessions()
    } catch (sleepEndError) {
      console.error('Error ending sleep after feeding', sleepEndError)
    }

    // Добавляем запись в activities для срабатывания триггера пробуждения
    try {
      await this.addActivity('feeding')
    } catch (activityError) {
      console.error('Error adding feeding activity', activityError)
    }

    return data
  }

  async deleteFeeding(id: number): Promise<boolean> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    const { data: existingFeeding, error: fetchError } = await supabase
      .from('feedings')
      .select('ounces')
      .eq('id', id)
      .eq('family_id', familyId)
      .eq('author_id', authorId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching feeding before deletion', fetchError)
    }

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

    const consumedOunces = existingFeeding?.ounces ? Number(existingFeeding.ounces) : 0

    if (consumedOunces > 0) {
      const gramsToRestore = consumedOunces * GRAMS_PER_OUNCE

      try {
        await this.adjustFamilyInventory({
          formulaGramsDelta: gramsToRestore,
          formulaPortionsDelta: consumedOunces
        })
      } catch (inventoryError) {
        console.error('Error restoring inventory after feeding deletion', inventoryError)
      }
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
        diaper_type: diaperType || '����'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding diaper', error)
      return null
    }

    try {
      await this.adjustFamilyInventory({
        diapersDelta: -1
      })
      console.log('Diaper change recorded: 1 diaper deducted from inventory')
    } catch (inventoryError) {
      console.error('Error updating inventory after diaper change', inventoryError)
    }

    // Прерываем сон при смене подгузника (если есть активные сессии)
    try {
      await this.endAllActiveSleepSessions()
    } catch (sleepEndError) {
      console.error('Error ending sleep after diaper change', sleepEndError)
    }

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

    try {
      await this.adjustFamilyInventory({
        diapersDelta: 1
      })
    } catch (inventoryError) {
      console.error('Error restoring inventory after diaper deletion', inventoryError)
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

    // Прерываем сон при купании (если есть активные сессии)
    try {
      await this.endAllActiveSleepSessions()
    } catch (sleepEndError) {
      console.error('Error ending sleep after bath', sleepEndError)
    }

    // Добавляем запись в activities для срабатывания триггера пробуждения
    try {
      await this.addActivity('bath')
    } catch (activityError) {
      console.error('Error adding bath activity', activityError)
    }

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

  async addActivity(activityType: string = 'activity', timestamp?: string): Promise<Activity | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName, authorRole } = this.requireAuthor()

    let eventDate = timestamp ? new Date(timestamp) : new Date()

    if (Number.isNaN(eventDate.getTime())) {
      eventDate = new Date()
    }

    const { data, error } = await supabase
      .from('activities')
      .insert({
        family_id: familyId,
        author_id: authorId,
        timestamp: eventDate.toISOString(),
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

  // Завершить все активные сессии сна семьи, независимо от автора
  async endAllActiveSleepSessions(): Promise<number> {
    const familyId = this.requireFamilyId()

    // Получаем все активные сессии (end_time IS NULL)
    const { data: activeSessions, error: listError } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('family_id', familyId)
      .is('end_time', null)
      .order('start_time', { ascending: false })

    if (listError) {
      console.error('Error listing active sleep sessions', listError)
      return 0
    }

    const sessions = activeSessions || []
    if (sessions.length === 0) {
      return 0
    }

    const endTime = new Date()
    let endedCount = 0

    for (const session of sessions) {
      const startTime = new Date(session.start_time)
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      const { error: updateError } = await supabase
        .from('sleep_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes
        })
        .eq('id', session.id)
        .eq('family_id', familyId)

      if (!updateError) {
        endedCount += 1
      } else {
        console.error('Error ending sleep session', updateError)
      }
    }

    return endedCount
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

  async getSleepSessionsWithinDays(days: number = 7): Promise<SleepSession[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('family_id', familyId)
      .gte('start_time', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error getting sleep sessions', error)
      return []
    }

    return data || []
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

  // Duty schedule operations
  async getDutySchedule(): Promise<DutyScheduleWithAssignments | null> {
    const familyId = this.requireFamilyId()

    // Получаем основной график
    const { data: schedule, error: scheduleError } = await supabase
      .from('duty_schedules')
      .select('*')
      .eq('family_id', familyId)
      .single()

    if (scheduleError) {
      if (scheduleError.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching duty schedule', scheduleError)
      return null
    }

    // Получаем назначения
    const { data: assignments, error: assignmentsError } = await supabase
      .from('duty_assignments')
      .select('*')
      .eq('family_id', familyId)
      .order('block_id')

    if (assignmentsError) {
      console.error('Error fetching duty assignments', assignmentsError)
      return null
    }

    return {
      ...schedule,
      assignments: assignments || []
    }
  }

  async saveDutySchedule(schedule: {
    block_duration_hours: number
    start_hour_offset: number
    assignments: Array<{ block_id: string; parent_id?: string }>
  }): Promise<DutyScheduleWithAssignments | null> {
    const familyId = this.requireFamilyId()
    const { authorId } = this.requireAuthor()

    try {
      // Сохраняем основной график
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('duty_schedules')
        .upsert({
          family_id: familyId,
          block_duration_hours: schedule.block_duration_hours,
          start_hour_offset: schedule.start_hour_offset,
          updated_by: authorId
        }, {
          onConflict: 'family_id'
        })
        .select()
        .single()

      if (scheduleError) {
        console.error('Error saving duty schedule', scheduleError)
        return null
      }

      // Удаляем старые назначения
      const { error: deleteError } = await supabase
        .from('duty_assignments')
        .delete()
        .eq('family_id', familyId)

      if (deleteError) {
        console.error('Error deleting old duty assignments', deleteError)
        return null
      }

      // Добавляем новые назначения
      if (schedule.assignments.length > 0) {
        const assignmentsData = schedule.assignments.map(assignment => ({
          family_id: familyId,
          block_id: assignment.block_id,
          parent_id: assignment.parent_id || null
        }))

        const { error: insertError } = await supabase
          .from('duty_assignments')
          .insert(assignmentsData)

        if (insertError) {
          console.error('Error inserting duty assignments', insertError)
          return null
        }
      }

      // Возвращаем обновленный график
      return await this.getDutySchedule()
    } catch (error) {
      console.error('Error saving duty schedule', error)
      return null
    }
  }

  async getCurrentDutyMember(): Promise<FamilyMember | null> {
    const familyId = this.requireFamilyId()
    const currentHour = new Date().getHours()

    // Получаем график дежурств
    const schedule = await this.getDutySchedule()
    if (!schedule) {
      return null
    }

    // Находим назначение для текущего часа
    const currentAssignment = schedule.assignments.find(assignment => {
      const blockId = assignment.block_id
      const [startHourStr, endHourStr] = blockId.split('-')
      const startHour = parseInt(startHourStr)
      const endHour = parseInt(endHourStr)

      // Обрабатываем случай, когда блок пересекает полночь
      if (startHour > endHour) {
        return currentHour >= startHour || currentHour < endHour
      } else {
        return currentHour >= startHour && currentHour < endHour
      }
    })

    if (!currentAssignment?.parent_id) {
      return null
    }

    // Получаем информацию о члене семьи
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .eq('user_id', currentAssignment.parent_id)
      .single()

    if (error) {
      console.error('Error fetching current duty member', error)
      return null
    }

    return {
      ...data,
      user_id: String(data.user_id)
    }
  }

  // Growth measurements operations
  async getGrowthMeasurements(measurementType?: 'height' | 'weight'): Promise<GrowthMeasurement[]> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .rpc('get_family_growth_measurements', {
        family_id_param: familyId,
        measurement_type_param: measurementType || null
      })

    if (error) {
      console.error('Error fetching growth measurements', error)
      return []
    }

    return (data || []).map(measurement => ({
      ...measurement,
      user_id: String(measurement.user_id)
    }))
  }

  async addGrowthMeasurement(
    measurementType: 'height' | 'weight',
    month: number,
    value: number
  ): Promise<GrowthMeasurement | null> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName } = this.requireAuthor()

    const { data, error } = await supabase
      .rpc('add_growth_measurement', {
        p_family_id: familyId,
        p_user_id: authorId,
        p_measurement_type: measurementType,
        p_month: month,
        p_value: value,
        p_recorded_by: authorName
      })

    if (error) {
      console.error('Error adding growth measurement', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return {
      ...data[0],
      user_id: String(data[0].user_id)
    }
  }

  async deleteGrowthMeasurement(
    measurementType: 'height' | 'weight',
    month: number
  ): Promise<boolean> {
    const familyId = this.requireFamilyId()

    const { data, error } = await supabase
      .rpc('delete_growth_measurement', {
        family_id_param: familyId,
        measurement_type_param: measurementType,
        month_param: month
      })

    if (error) {
      console.error('Error deleting growth measurement', error)
      return false
    }

    return data || false
  }

  async migrateGrowthDataFromLocalStorage(
    storageKey: string,
    measurementType: 'height' | 'weight'
  ): Promise<number> {
    const familyId = this.requireFamilyId()
    const { authorId, authorName } = this.requireAuthor()

    try {
      // Получаем данные из localStorage
      const storedData = window.localStorage.getItem(storageKey)
      if (!storedData) {
        return 0
      }

      const measurements = JSON.parse(storedData)
      if (!Array.isArray(measurements)) {
        return 0
      }

      let migratedCount = 0

      // Мигрируем каждое измерение
      for (const measurement of measurements) {
        if (measurement.month !== undefined && measurement.value !== undefined) {
          const result = await this.addGrowthMeasurement(
            measurementType,
            measurement.month,
            measurement.value
          )
          
          if (result) {
            migratedCount++
          }
        }
      }

      // Очищаем localStorage после успешной миграции
      if (migratedCount > 0) {
        window.localStorage.removeItem(storageKey)
      }

      return migratedCount
    } catch (error) {
      console.error('Error migrating growth data from localStorage', error)
      return 0
    }
  }
}

export const dataService = new DataService()
