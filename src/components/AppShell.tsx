import React, { type ReactNode } from 'react';
import { ActiveWorkoutTopBanner } from './ActiveWorkoutTopBanner';
import { AppHeader } from './AppHeader';
import { BottomTabBar } from './BottomTabBar';
import { PWAInstallBanner } from './PWAInstallBanner';
import { RoutineView } from './RoutineView';
import { TabContent } from './TabContent';
import { useAppShell } from '../hooks/shell/useAppShell';

interface AppShellProps {
  children?: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const shell = useAppShell();

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans antialiased selection:bg-[#00FF87] selection:text-black">
      {shell.activeRoutineId && shell.activeRoutine ? (
        <RoutineView
          routine={shell.activeRoutine}
          catalog={shell.catalog}
          rmLogs={shell.rmLogs}
          exerciseDiary={shell.exerciseDiary}
          initialMode={shell.routineSubMode}
          session={shell.activeSessions[shell.activeRoutine.id]}
          activeRestTimer={shell.activeRestTimer}
          onSaveRoutine={shell.saveRoutine}
          onSaveToCatalog={shell.createCatalogExercise}
          onBack={shell.onBack}
          onStartSession={shell.startSession}
          onToggleSetComplete={shell.toggleSetComplete}
          onResetSession={shell.resetSession}
          onFinishSession={shell.finishSession}
          onCheckRmWeight={shell.checkRmWeight}
          onOpenDiary={shell.openDiary}
          onStartRestTimer={shell.startRestTimer}
          onCloseRestTimer={shell.closeRestTimer}
        />
      ) : (
        <div className="flex flex-col min-h-screen pb-16">
          <AppHeader />

          <ActiveWorkoutTopBanner />

          <PWAInstallBanner />

          <main className="flex-1 pb-6">
            <TabContent />
          </main>

          <BottomTabBar />
        </div>
      )}
      {children}
    </div>
  );
};
