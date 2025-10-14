import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Button from './Button';

interface HistoryCheckResult {
  user_id: number;
  user_name: string;
  achievement_id: number;
  achievement_name: string;
  points: number;
  coins_reward: number;
  rarity: string;
}

const AchievementHistoryChecker: React.FC = () => {
  const { family, member } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<HistoryCheckResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkFamilyHistory = async () => {
    if (!family || !member) return;

    setIsChecking(true);
    setError(null);
    setResults([]);

    try {
      // Вызываем функцию проверки истории семьи
      const { data, error: rpcError } = await supabase.rpc('check_family_history_and_award_achievements', {
        family_id_param: family.id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setResults(data || []);
    } catch (err) {
      console.error('Error checking family history:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при проверке истории');
    } finally {
      setIsChecking(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Разрешение на уведомления получено');
      } else {
        console.log('Разрешение на уведомления отклонено');
      }
    }
  };

  if (!family || !member) {
    return null;
  }

  return (
    <div className="rounded-3xl">
      <h3 className="text-sm font-semibold mb-3">Проверка достижений</h3>
      
      <div className="space-y-3">
        <Button
          onClick={checkFamilyHistory}
          disabled={isChecking}
          className="w-full text-xs"
          size="sm"
        >
          {isChecking ? 'Проверяем...' : 'Проверить историю семьи'}
        </Button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-2">
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-3xl p-3">
            <h4 className="font-semibold text-green-800 mb-2 text-xs">
              Выдано достижений: {results.length}
            </h4>
            <div className="space-y-1">
              {results.map((result, index) => (
                <div key={index} className="text-xs text-green-700">
                  <span className="font-medium">{result.user_name}</span> получил{' '}
                  <span className="font-semibold">{result.achievement_name}</span>
                  {' '}({result.points} очков, {result.coins_reward} монет)
                </div>
              ))}
            </div>
          </div>
        )}

        {Notification.permission !== 'granted' && (
          <div className="border-t pt-3">
            <h4 className="font-semibold mb-2 text-xs">Уведомления</h4>
            <Button
              onClick={requestNotificationPermission}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
            >
              Разрешить уведомления
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementHistoryChecker;