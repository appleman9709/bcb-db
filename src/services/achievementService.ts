import { supabase } from '../lib/supabaseClient';

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  coins_reward: number;
  criteria: any;
  is_active: boolean;
  type_id: number;
}

export interface UserAchievement {
  achievement_id: number;
  achievement_name: string;
  achievement_description: string;
  icon: string;
  color: string;
  rarity: string;
  points: number;
  coins_reward: number;
  earned_at: string;
}

export interface AchievementProgress {
  achievement_id: number;
  current_value: number;
  target_value: number;
  progress_data: any;
}

export interface FamilyAchievementStats {
  total_achievements: number;
  total_points: number;
  total_coins_earned: number;
  last_achievement_at: string | null;
  top_achiever_user_id: number | null;
  top_achiever_name: string | null;
  top_achiever_count: number | null;
}

export interface NewAchievement {
  achievement_id: number;
  achievement_name: string;
  points: number;
  coins_reward: number;
  rarity: string;
}

class AchievementService {
  private normalizeUserId(userId: string | number | null | undefined): string | null {
    if (typeof userId === 'string') {
      const trimmed = userId.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof userId === 'number' && Number.isFinite(userId)) {
      return Math.trunc(userId).toString();
    }

    return null;
  }

  /**
   * Проверяет и выдает достижения после выполнения действия
   */
  async checkAndAwardAchievements(
    familyId: number,
    userId: string | number,
    activityType: 'feeding' | 'diaper' | 'bath' | 'activity' | 'sleep',
    activityData: any = {}
  ): Promise<NewAchievement[]> {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      console.warn('[AchievementService] Skipping checkAndAwardAchievements: empty userId', { familyId, userId });
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('check_and_award_achievements', {
        family_id_param: familyId,
        user_id_param: normalizedUserId,
        activity_type: activityType,
        activity_data: activityData
      });

      if (error) {
        console.error('Error checking achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in checkAndAwardAchievements:', error);
      return [];
    }
  }

  /**
   * Получает все достижения пользователя
   */
  async getUserAchievements(familyId: number, userId: string | number): Promise<UserAchievement[]> {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      console.warn('[AchievementService] Skipping getUserAchievements: empty userId', { familyId, userId });
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('get_user_achievements', {
        family_id_param: familyId,
        user_id_param: normalizedUserId
      });

      if (error) {
        console.error('Error fetching user achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserAchievements:', error);
      return [];
    }
  }

  /**
   * Получает статистику достижений семьи
   */
  async getFamilyAchievementStats(familyId: number): Promise<FamilyAchievementStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_family_achievement_stats', {
        family_id_param: familyId
      });

      if (error) {
        console.error('Error fetching family achievement stats:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in getFamilyAchievementStats:', error);
      return null;
    }
  }

  /**
   * Получает все доступные достижения
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: false })
        .order('points', { ascending: false });

      if (error) {
        console.error('Error fetching achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllAchievements:', error);
      return [];
    }
  }

  /**
   * Получает прогресс достижений пользователя
   */
  async getUserAchievementProgress(familyId: number, userId: string | number): Promise<AchievementProgress[]> {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      console.warn('[AchievementService] Skipping getUserAchievementProgress: empty userId', { familyId, userId });
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('family_id', familyId)
        .eq('user_id', normalizedUserId);

      if (error) {
        console.error('Error fetching achievement progress:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserAchievementProgress:', error);
      return [];
    }
  }

  /**
   * Получает достижения по типу
   */
  async getAchievementsByType(typeId: number): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('type_id', typeId)
        .eq('is_active', true)
        .order('points', { ascending: false });

      if (error) {
        console.error('Error fetching achievements by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAchievementsByType:', error);
      return [];
    }
  }

  /**
   * Получает типы достижений
   */
  async getAchievementTypes() {
    try {
      const { data, error } = await supabase
        .from('achievement_types')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error fetching achievement types:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAchievementTypes:', error);
      return [];
    }
  }

  /**
   * Проверяет конкретное достижение
   */
  async checkSpecificAchievement(
    familyId: number,
    userId: string | number,
    achievementId: number
  ): Promise<boolean> {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      console.warn('[AchievementService] Skipping checkSpecificAchievement: empty userId', { familyId, userId, achievementId });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('family_id', familyId)
        .eq('user_id', normalizedUserId)
        .eq('achievement_id', achievementId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking specific achievement:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in checkSpecificAchievement:', error);
      return false;
    }
  }

  /**
   * Получает достижения по редкости
   */
  async getAchievementsByRarity(rarity: 'common' | 'rare' | 'epic' | 'legendary'): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('rarity', rarity)
        .eq('is_active', true)
        .order('points', { ascending: false });

      if (error) {
        console.error('Error fetching achievements by rarity:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAchievementsByRarity:', error);
      return [];
    }
  }

  /**
   * Получает топ достижения семьи
   */
  async getFamilyTopAchievements(familyId: number, limit: number = 10): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          achievement_id,
          earned_at,
          achievements!inner(
            name,
            description,
            icon,
            color,
            rarity,
            points,
            coins_reward
          )
        `)
        .eq('family_id', familyId)
        .order('earned_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching family top achievements:', error);
        return [];
      }

      return data?.map(item => ({
        achievement_id: item.achievement_id,
        achievement_name: item.achievements.name,
        achievement_description: item.achievements.description,
        icon: item.achievements.icon,
        color: item.achievements.color,
        rarity: item.achievements.rarity,
        points: item.achievements.points,
        coins_reward: item.achievements.coins_reward,
        earned_at: item.earned_at
      })) || [];
    } catch (error) {
      console.error('Error in getFamilyTopAchievements:', error);
      return [];
    }
  }

  /**
   * Получает статистику достижений по типам
   */
  async getAchievementStatsByType(familyId: number, userId: string | number) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      console.warn('[AchievementService] Skipping getAchievementStatsByType: empty userId', { familyId, userId });
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          achievement_id,
          achievements!inner(
            type_id,
            achievement_types!inner(name, icon, color)
          )
        `)
        .eq('family_id', familyId)
        .eq('user_id', normalizedUserId);

      if (error) {
        console.error('Error fetching achievement stats by type:', error);
        return {};
      }

      const stats: { [key: string]: { count: number; name: string; icon: string; color: string } } = {};
      
      data?.forEach(item => {
        const typeName = item.achievements.achievement_types.name;
        if (!stats[typeName]) {
          stats[typeName] = {
            count: 0,
            name: typeName,
            icon: item.achievements.achievement_types.icon,
            color: item.achievements.achievement_types.color
          };
        }
        stats[typeName].count++;
      });

      return stats;
    } catch (error) {
      console.error('Error in getAchievementStatsByType:', error);
      return {};
    }
  }

  /**
   * Проверяет историю семьи и выдает недостающие достижения
   */
  async checkFamilyHistoryAndAwardAchievements(familyId: number): Promise<NewAchievement[]> {
    try {
      const { data, error } = await supabase.rpc('check_family_history_and_award_achievements', {
        family_id_param: familyId
      });

      if (error) {
        console.error('Error checking family history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in checkFamilyHistoryAndAwardAchievements:', error);
      return [];
    }
  }

  /**
   * Получает уведомления о достижениях для пользователя
   */
  async getAchievementNotifications(
    familyId: number,
    userId: string | number,
    limit: number = 10
  ): Promise<UserAchievement[]> {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      console.warn('[AchievementService] Skipping getAchievementNotifications: empty userId', { familyId, userId });
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('get_achievement_notifications', {
        family_id_param: familyId,
        user_id_param: normalizedUserId,
        limit_count: limit
      });

      if (error) {
        console.error('Error fetching achievement notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAchievementNotifications:', error);
      return [];
    }
  }

  /**
   * Отправляет уведомление о достижении
   */
  async sendAchievementNotification(achievement: NewAchievement) {
    try {
      // Проверяем поддержку уведомлений
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`🎉 ${achievement.achievement_name}`, {
          body: `Получено достижение! ${achievement.points} очков, ${achievement.coins_reward} монет`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'achievement',
          requireInteraction: true,
          data: {
            achievementId: achievement.achievement_id,
            points: achievement.points,
            coins: achievement.coins_reward
          }
        });

        // Автоматически закрываем уведомление через 5 секунд
        setTimeout(() => {
          notification.close();
        }, 5000);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending achievement notification:', error);
      return false;
    }
  }

  /**
   * Запрашивает разрешение на уведомления
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
}

export const achievementService = new AchievementService();
