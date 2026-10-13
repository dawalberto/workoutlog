import React from 'react';
import { useRmLogActions } from '../hooks/useRmLogActions';
import { RmExerciseList } from './rm-logs/RmExerciseList';

export const RmLogsView: React.FC = () => {
  const actions = useRmLogActions();
  return (
    <div id="rm-logs-container" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <RmExerciseList actions={actions} />
      </div>
    </div>
  );
};
