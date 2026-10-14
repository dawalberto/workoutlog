import { useAppStore } from '../../store/appStore';

export function useRmRecordAlert() {
  const pendingRmAlert = useAppStore((state) => state.pendingRmAlert);
  const onConfirm = useAppStore((state) => state.confirmRmAlert);
  const onClose = useAppStore((state) => state.dismissRmAlert);

  return {
    isOpen: Boolean(pendingRmAlert),
    exerciseName: pendingRmAlert?.exerciseName || '',
    newWeight: pendingRmAlert?.newWeight || 0,
    previousRmWeight: pendingRmAlert?.previousRmWeight || 0,
    previousRmDate: pendingRmAlert?.previousRmDate,
    onConfirm,
    onClose,
  };
}
