import { useAppStore } from '../../store/appStore';

export function useSignOutConfirmDialog() {
  const isOpen = useAppStore((state) => state.isSignOutConfirmOpen);
  const resolveConfirmation = useAppStore((state) => state.resolveSignOutConfirmation);
  const onCancel = () => resolveConfirmation(false);
  const onConfirm = () => resolveConfirmation(true);
  return { isOpen, onCancel, onConfirm };
}
