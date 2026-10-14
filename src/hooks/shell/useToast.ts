import { useAppStore } from '../../store/appStore';

export function useToast() {
  const message = useAppStore((state) => state.feedbackMessage);
  const onClose = useAppStore((state) => state.clearFeedback);
  return { message, onClose };
}
