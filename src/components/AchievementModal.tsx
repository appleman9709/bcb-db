import React from 'react';
import { AchievementGrid } from './AchievementGrid';

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
  if (!isOpen) return null;

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

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <AchievementGrid familyId={familyId} userId={userId} />
        </div>
      </div>
    </div>
  );
};

export { AchievementModal };
