import { useAppStore } from '../../store/appStore';

export function useGlobalOverlays() {
  const activeRestTimer = useAppStore((state) => state.activeRestTimer);
  const closeBackupModal = useAppStore((state) => state.closeBackupModal);
  return { activeRestTimer, closeBackupModal };
}
