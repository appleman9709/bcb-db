import React, { useState, useEffect } from 'react';
import { achievementService, Achievement, UserAchievement } from '../services/achievementService';

interface AchievementGridProps {
  familyId: number;
  userId: number;
}

interface AchievementWithStatus extends Achievement {
  isEarned: boolean;
  earnedAt?: string;
  progress?: number;
  maxProgress?: number;
}

const AchievementGrid: React.FC<AchievementGridProps> = ({ familyId, userId }) => {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithStatus | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [familyId, userId]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const [allAchievements, earnedAchievements] = await Promise.all([
        achievementService.getAllAchievements(),
        achievementService.getUserAchievements(familyId, userId)
      ]);

      setUserAchievements(earnedAchievements);

      // Создаем массив достижений с информацией о статусе
      const achievementsWithStatus: AchievementWithStatus[] = allAchievements.map(achievement => {
        const earnedAchievement = earnedAchievements.find(ua => ua.achievement_id === achievement.id);
        return {
          ...achievement,
          isEarned: !!earnedAchievement,
          earnedAt: earnedAchievement?.earned_at,
          progress: 0, // TODO: Добавить логику прогресса
          maxProgress: 100
        };
      });

      // Сортируем: сначала полученные, потом по редкости
      const rarityOrder = ['legendary', 'epic', 'rare', 'common'];
      achievementsWithStatus.sort((a, b) => {
        if (a.isEarned !== b.isEarned) {
          return a.isEarned ? -1 : 1;
        }
        const aIndex = rarityOrder.indexOf(a.rarity);
        const bIndex = rarityOrder.indexOf(b.rarity);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return b.points - a.points;
      });

      setAchievements(achievementsWithStatus);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string, isEarned: boolean) => {
    if (!isEarned) {
      return 'text-gray-400';
    }
    
    switch (rarity) {
      case 'legendary':
        return 'text-yellow-500';
      case 'epic':
        return 'text-purple-500';
      case 'rare':
        return 'text-blue-500';
      case 'common':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRarityBorderColor = (rarity: string, isEarned: boolean) => {
    if (!isEarned) {
      return 'border-gray-200';
    }
    
    switch (rarity) {
      case 'legendary':
        return 'border-yellow-300';
      case 'epic':
        return 'border-purple-300';
      case 'rare':
        return 'border-blue-300';
      case 'common':
        return 'border-gray-300';
      default:
        return 'border-gray-300';
    }
  };

  const getRarityBackgroundColor = (rarity: string, isEarned: boolean) => {
    if (!isEarned) {
      return 'bg-gray-50';
    }
    
    switch (rarity) {
      case 'legendary':
        return 'bg-yellow-50';
      case 'epic':
        return 'bg-purple-50';
      case 'rare':
        return 'bg-blue-50';
      case 'common':
        return 'bg-gray-50';
      default:
        return 'bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-3xl h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-3xl p-3 text-center border border-gray-200">
          <div className="text-lg font-bold text-blue-600">
            {userAchievements.length}
          </div>
          <div className="text-xs text-gray-600">Получено</div>
        </div>
        <div className="bg-white rounded-3xl p-3 text-center border border-gray-200">
          <div className="text-lg font-bold text-gray-600">
            {achievements.length - userAchievements.length}
          </div>
          <div className="text-xs text-gray-600">Осталось</div>
        </div>
      </div>

      {/* Сетка достижений */}
      <div className="grid grid-cols-4 gap-2">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`
              relative p-2 rounded-3xl border-2 cursor-pointer transition-all duration-200 hover:scale-105
              ${getRarityBackgroundColor(achievement.rarity, achievement.isEarned)}
              ${getRarityBorderColor(achievement.rarity, achievement.isEarned)}
              ${achievement.isEarned ? 'shadow-md' : 'shadow-sm'}
            `}
            onClick={() => setSelectedAchievement(achievement)}
          >
            {/* Иконка */}
            <div className="text-center">
              <div className={`text-2xl ${achievement.isEarned ? '' : 'grayscale opacity-60'}`}>
                {achievement.icon}
              </div>
            </div>

            {/* Индикатор редкости */}
            <div className="absolute top-1 right-1">
              <div className={`
                w-2 h-2 rounded-3xl
                ${achievement.isEarned ? getRarityColor(achievement.rarity, true) : 'bg-gray-300'}
              `}></div>
            </div>

            {/* Индикатор прогресса для недостигнутых */}
            {!achievement.isEarned && achievement.progress && achievement.maxProgress && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg">
                <div 
                  className="h-full bg-blue-400 rounded-b-lg transition-all duration-300"
                  style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                ></div>
              </div>
            )}

            {/* Дата получения */}
            {achievement.isEarned && achievement.earnedAt && (
              <div className="absolute bottom-0 left-0 right-0 text-xs text-center text-gray-500 bg-white bg-opacity-80 rounded-b-lg">
                {formatDate(achievement.earnedAt)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Модальное окно с деталями достижения */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">Детали достижения</h3>
              <button
                onClick={() => setSelectedAchievement(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="text-center mb-4">
              <div className={`text-4xl mb-2 ${selectedAchievement.isEarned ? '' : 'grayscale opacity-60'}`}>
                {selectedAchievement.icon}
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-1">
                {selectedAchievement.name}
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                {selectedAchievement.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Редкость:</span>
                <span className={`text-sm font-medium ${getRarityColor(selectedAchievement.rarity, selectedAchievement.isEarned)}`}>
                  {selectedAchievement.rarity === 'legendary' ? 'Легендарное' :
                   selectedAchievement.rarity === 'epic' ? 'Эпическое' :
                   selectedAchievement.rarity === 'rare' ? 'Редкое' : 'Обычное'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Очки:</span>
                <span className="text-sm font-medium text-blue-600">
                  {selectedAchievement.points}
                </span>
              </div>

              {selectedAchievement.coins_reward > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Монеты:</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {selectedAchievement.coins_reward}
                  </span>
                </div>
              )}

              {selectedAchievement.isEarned && selectedAchievement.earnedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Получено:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatDate(selectedAchievement.earnedAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => setSelectedAchievement(null)}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-3xl hover:bg-blue-600 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AchievementGrid };
