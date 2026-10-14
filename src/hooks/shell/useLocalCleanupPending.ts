import { useAppStore } from '../../store/appStore';

export function useLocalCleanupPending() {
  const error = useAppStore((state) => state.error);
  const isSigningOut = useAppStore((state) => state.isSigningOut);
  const retryLocalCleanup = useAppStore((state) => state.retryLocalCleanup);
  const onRetry = () => void retryLocalCleanup();

  return { error, isSigningOut, onRetry };
}
