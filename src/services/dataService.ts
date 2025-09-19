import { supabase } from '../lib/supabaseClient'

export interface Family {
  id: number
  name: string
  created_at: string
}

export interface Feeding {
  id: number
  family_id: number
  author_id: number
  timestamp: string
  author_role: string
  author_name: string
  created_at: string
}

export interface Diaper {
  id: number
  family_id: number
  author_id: number
  timestamp: string
  author_role: string
  author_name: string
  created_at: string
}

export interface Bath {
  id: number
  family_id: number
  author_id: number
  timestamp: string
  author_role: string
  author_name: string
  created_at: string
}

export interface Activity {
  id: number
  family_id: number
  author_id: number
  timestamp: string
  activity_type: string
  author_role: string
  author_name: string
  created_at: string
}

export interface Tip {
  id: number
  age_months: number
  content: string
  category: string
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

class DataService {
  private familyId: number = 1 // TODO: Get from user context

  // Family operations
  async getFamily(): Promise<Family | null> {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', this.familyId)
      .single()

    if (error) {
      console.error('Error fetching family:', error)
      return null
    }
    return data
  }

  // Feeding operations
  async getFeedings(limit: number = 10): Promise<Feeding[]> {
    const { data, error } = await supabase
      .from('feedings')
      .select('*')
      .eq('family_id', this.familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching feedings:', error)
      return []
    }
    return data || []
  }

  async getLastFeeding(): Promise<Feeding | null> {
    const { data, error } = await supabase
      .from('feedings')
      .select('*')
      .eq('family_id', this.familyId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching last feeding:', error)
      return null
    }
    return data
  }

  async addFeeding(): Promise<Feeding | null> {
    const { data, error } = await supabase
      .from('feedings')
      .insert({
        family_id: this.familyId,
        author_id: 1, // TODO: Get from user context
        timestamp: new Date().toISOString(),
        author_role: 'Родитель',
        author_name: 'Пользователь'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding feeding:', error)
      return null
    }
    return data
  }

  // Diaper operations
  async getDiapers(limit: number = 10): Promise<Diaper[]> {
    const { data, error } = await supabase
      .from('diapers')
      .select('*')
      .eq('family_id', this.familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching diapers:', error)
      return []
    }
    return data || []
  }

  async getLastDiaper(): Promise<Diaper | null> {
    const { data, error } = await supabase
      .from('diapers')
      .select('*')
      .eq('family_id', this.familyId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching last diaper:', error)
      return null
    }
    return data
  }

  async addDiaper(): Promise<Diaper | null> {
    const { data, error } = await supabase
      .from('diapers')
      .insert({
        family_id: this.familyId,
        author_id: 1, // TODO: Get from user context
        timestamp: new Date().toISOString(),
        author_role: 'Родитель',
        author_name: 'Пользователь'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding diaper:', error)
      return null
    }
    return data
  }

  // Bath operations
  async getBaths(limit: number = 10): Promise<Bath[]> {
    const { data, error } = await supabase
      .from('baths')
      .select('*')
      .eq('family_id', this.familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching baths:', error)
      return []
    }
    return data || []
  }

  async getLastBath(): Promise<Bath | null> {
    const { data, error } = await supabase
      .from('baths')
      .select('*')
      .eq('family_id', this.familyId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching last bath:', error)
      return null
    }
    return data
  }

  async addBath(): Promise<Bath | null> {
    const { data, error } = await supabase
      .from('baths')
      .insert({
        family_id: this.familyId,
        author_id: 1, // TODO: Get from user context
        timestamp: new Date().toISOString(),
        author_role: 'Родитель',
        author_name: 'Пользователь'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding bath:', error)
      return null
    }
    return data
  }

  // Activity operations
  async getActivities(limit: number = 10): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('family_id', this.familyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }
    return data || []
  }

  async addActivity(activityType: string = 'Игра'): Promise<Activity | null> {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        family_id: this.familyId,
        author_id: 1, // TODO: Get from user context
        timestamp: new Date().toISOString(),
        activity_type: activityType,
        author_role: 'Родитель',
        author_name: 'Пользователь'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding activity:', error)
      return null
    }
    return data
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
      console.error('Error fetching tips:', error)
      return []
    }
    return data || []
  }

  async getRandomTip(ageMonths?: number): Promise<Tip | null> {
    const tips = await this.getTips(ageMonths)
    if (tips.length === 0) return null
    
    const randomIndex = Math.floor(Math.random() * tips.length)
    return tips[randomIndex]
  }

  // Settings operations
  async getSettings(): Promise<Settings | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('family_id', this.familyId)
      .single()

    if (error) {
      console.error('Error fetching settings:', error)
      return null
    }
    return data
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings | null> {
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        family_id: this.familyId,
        ...settings
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating settings:', error)
      return null
    }
    return data
  }

  // Statistics
  async getTodayStats() {
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

    const todayFeedings = feedings.filter(f => 
      new Date(f.timestamp) >= today && new Date(f.timestamp) < tomorrow
    )
    const todayDiapers = diapers.filter(d => 
      new Date(d.timestamp) >= today && new Date(d.timestamp) < tomorrow
    )
    const todayBaths = baths.filter(b => 
      new Date(b.timestamp) >= today && new Date(b.timestamp) < tomorrow
    )
    const todayActivities = activities.filter(a => 
      new Date(a.timestamp) >= today && new Date(a.timestamp) < tomorrow
    )

    return {
      feedings: todayFeedings.length,
      diapers: todayDiapers.length,
      baths: todayBaths.length,
      activities: todayActivities.length
    }
  }
}

export const dataService = new DataService()
