import { useAppStore } from '../../store/appStore';
import { ROUTINE_LIMIT_ERROR_MESSAGE } from '../../utils/backup';

export function useToast() {
  const message = useAppStore((state) => state.feedbackMessage);
  const isAuthenticated = useAppStore((state) => Boolean(state.user));
  const isSigningIn = useAppStore((state) => state.isSigningIn);
  const onClose = useAppStore((state) => state.clearFeedback);
  const onSignIn = useAppStore((state) => state.signInWithGoogle);

  // Guests hitting the routine limit get a direct sign-in shortcut in the toast.
  const showSignIn = !isAuthenticated && message === ROUTINE_LIMIT_ERROR_MESSAGE;

  return { message, onClose, onSignIn, showSignIn, isSigningIn };
}
