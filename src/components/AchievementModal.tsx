import React, { useState, useEffect } from 'react';
import { achievementService, UserAchievement, FamilyAchievementStats } from '../services/achievementService';
import { AchievementCard } from './AchievementCard';
import Card from './Card';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: number;
  userId: number;
}

const AchievementModal: React.FC<AchievementModalProps> = ({
  isOpen,
  onClose,
  familyId,
  userId
}) => {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [familyStats, setFamilyStats] = useState<FamilyAchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'user' | 'family'>('user');

  useEffect(() => {
    if (isOpen) {
      loadAchievements();
    }
  }, [isOpen, familyId, userId]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const [userAchievementsData, familyStatsData] = await Promise.all([
        achievementService.getUserAchievements(familyId, userId),
        achievementService.getFamilyAchievementStats(familyId)
      ]);
      
      setUserAchievements(userAchievementsData);
      setFamilyStats(familyStatsData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const rarityOrder = ['legendary', 'epic', 'rare', 'common'];
  const sortedAchievements = [...userAchievements].sort((a, b) => {
    const aIndex = rarityOrder.indexOf(a.rarity);
    const bIndex = rarityOrder.indexOf(b.rarity);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return b.points - a.points;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">🏆 Достижения</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('user')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'user'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Мои достижения
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'family'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Статистика семьи
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'user' && (
                <div>
                  {sortedAchievements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🏆</div>
                      <p>У вас пока нет достижений</p>
                      <p className="text-sm mt-1">Продолжайте заботиться о малыше!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sortedAchievements.map((achievement) => (
                          <AchievementCard
                            key={achievement.achievement_id}
                            achievement={achievement}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'family' && (
                <div>
                  {familyStats ? (
                    <div className="space-y-4">
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-3">📊 Общая статистика</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {familyStats.total_achievements}
                            </div>
                            <div className="text-sm text-gray-600">Достижений</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {familyStats.total_points}
                            </div>
                            <div className="text-sm text-gray-600">Очков</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {familyStats.total_coins_earned}
                            </div>
                            <div className="text-sm text-gray-600">Монет</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {familyStats.top_achiever_count || 0}
                            </div>
                            <div className="text-sm text-gray-600">Лучший результат</div>
                          </div>
                        </div>
                      </Card>

                      {familyStats.top_achiever_name && (
                        <Card className="p-4">
                          <h3 className="text-lg font-semibold mb-3">👑 Чемпион семьи</h3>
                          <div className="flex items-center space-x-3">
                            <div className="text-3xl">👑</div>
                            <div>
                              <div className="font-semibold">{familyStats.top_achiever_name}</div>
                              <div className="text-sm text-gray-600">
                                {familyStats.top_achiever_count} достижений
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {familyStats.last_achievement_at && (
                        <Card className="p-4">
                          <h3 className="text-lg font-semibold mb-3">⏰ Последнее достижение</h3>
                          <div className="text-gray-600">
                            {new Date(familyStats.last_achievement_at).toLocaleString('ru-RU')}
                          </div>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p>Статистика недоступна</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export { AchievementModal };
