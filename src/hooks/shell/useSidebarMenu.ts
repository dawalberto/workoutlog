import { useAppStore } from '../../store/appStore';
import { useTabCounts } from './useTabCounts';

export function useSidebarMenu() {
  const isOpen = useAppStore((state) => state.isMenuOpen);
  const onClose = useAppStore((state) => state.closeMenu);
  const activeTab = useAppStore((state) => state.activeTab);
  const onSelectTab = useAppStore((state) => state.setActiveTab);
  const onOpenBackup = useAppStore((state) => state.openBackupModal);
  const user = useAppStore((state) => state.user);
  const isSyncEnabled = useAppStore((state) => state.isSyncEnabled);
  const isSyncEligibilityLoading = useAppStore((state) => state.isSyncEligibilityLoading);
  const isOnline = useAppStore((state) => state.isOnline);
  const isSigningIn = useAppStore((state) => state.isSigningIn);
  const isSigningOut = useAppStore((state) => state.isSigningOut);
  const error = useAppStore((state) => state.error ?? state.storageError);
  const onSignIn = useAppStore((state) => state.signInWithGoogle);
  const signOut = useAppStore((state) => state.signOut);
  const counts = useTabCounts();

  const handleNav = (tab: Parameters<typeof onSelectTab>[0]) => {
    onSelectTab(tab);
    onClose();
  };
  const handleBackup = () => {
    onOpenBackup();
    onClose();
  };
  const onSignOut = async () => {
    await signOut();
  };

  return {
    isOpen,
    onClose,
    activeTab,
    routinesCount: counts.routinesCount,
    catalogCount: counts.catalogCount,
    rmCount: counts.rmCount,
    historyCount: counts.historyCount,
    diaryCount: counts.diaryCount,
    isAuthenticated: Boolean(user),
    userEmail: user?.email ?? null,
    isSyncEnabled,
    isSyncEligibilityLoading,
    isOnline,
    isSigningIn,
    isSigningOut,
    error,
    onSignIn,
    onSignOut,
    handleNav,
    handleBackup,
  };
}
