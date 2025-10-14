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
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-3xl p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-4 overflow-y-auto max-h-[90vh]">
          <AchievementGrid familyId={familyId} userId={userId} />
        </div>
      </div>
    </div>
  );
};

export { AchievementModal };
