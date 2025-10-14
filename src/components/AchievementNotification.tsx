import React, { useState, useEffect } from 'react';
import { achievementService, NewAchievement } from '../services/achievementService';

interface AchievementNotificationProps {
  achievement: NewAchievement;
  onClose: () => void;
}

const rarityStyles = {
  common: 'bg-gray-100 border-gray-300 text-gray-800',
  rare: 'bg-blue-100 border-blue-300 text-blue-800',
  epic: 'bg-purple-100 border-purple-300 text-purple-800',
  legendary: 'bg-yellow-100 border-yellow-300 text-yellow-800'
};

const rarityIcons = {
  common: '🏆',
  rare: '🥈',
  epic: '🥇',
  legendary: '👑'
};

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Анимация появления
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Даем время для анимации
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`max-w-sm rounded-3xl border-2 p-4 shadow-lg ${rarityStyles[achievement.rarity as keyof typeof rarityStyles] || rarityStyles.common}`}>
        <div className="flex items-start space-x-3">
          <div className="text-3xl">
            {rarityIcons[achievement.rarity as keyof typeof rarityIcons] || rarityIcons.common}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Новое достижение!
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ×
              </button>
            </div>
            <h4 className="font-semibold text-sm mt-1">
              {achievement.achievement_name}
            </h4>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs bg-white px-2 py-1 rounded-3xl">
                +{achievement.points} очков
              </span>
              {achievement.coins_reward > 0 && (
                <span className="text-xs bg-yellow-200 px-2 py-1 rounded-3xl">
                  +{achievement.coins_reward} монет
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AchievementNotification };
