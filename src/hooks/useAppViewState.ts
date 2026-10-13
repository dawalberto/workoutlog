import { useState } from 'react';
import { AppTab } from '../types';

export function useAppViewState() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ROUTINES);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const openMenu = () => setIsMenuOpen(true);
  const closeMenu = () => setIsMenuOpen(false);
  const openBackupModal = () => setIsBackupModalOpen(true);
  const closeBackupModal = () => setIsBackupModalOpen(false);

  return {
    activeTab,
    closeMenu,
    closeBackupModal,
    isBackupModalOpen,
    isMenuOpen,
    openBackupModal,
    openMenu,
    setActiveTab,
    setIsBackupModalOpen,
    setIsMenuOpen,
  };
}
