import React from 'react';
import { UserAchievement } from '../services/achievementService';

interface AchievementCardProps {
  achievement: UserAchievement;
  showProgress?: boolean;
  progress?: number;
  maxProgress?: number;
}

const rarityColors = {
  common: 'bg-gray-100 border-gray-300',
  rare: 'bg-blue-100 border-blue-300',
  epic: 'bg-purple-100 border-purple-300',
  legendary: 'bg-yellow-100 border-yellow-300'
};

const rarityTextColors = {
  common: 'text-gray-700',
  rare: 'text-blue-700',
  epic: 'text-purple-700',
  legendary: 'text-yellow-700'
};

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  showProgress = false,
  progress = 0,
  maxProgress = 100
}) => {
  const progressPercentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <div className={`rounded-lg border-2 p-4 ${rarityColors[achievement.rarity as keyof typeof rarityColors] || rarityColors.common}`}>
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{achievement.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-sm ${rarityTextColors[achievement.rarity as keyof typeof rarityTextColors] || rarityTextColors.common}`}>
              {achievement.achievement_name}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-white px-2 py-1 rounded-full">
                {achievement.points} очков
              </span>
              {achievement.coins_reward > 0 && (
                <span className="text-xs bg-yellow-200 px-2 py-1 rounded-full">
                  {achievement.coins_reward} монет
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {achievement.achievement_description}
          </p>
          {showProgress && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Прогресс</span>
                <span>{progress}/{maxProgress}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            Получено: {new Date(achievement.earned_at).toLocaleDateString('ru-RU')}
          </div>
        </div>
      </div>
    </div>
  );
};

export { AchievementCard };
