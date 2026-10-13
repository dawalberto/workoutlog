import { useAppStore } from '../../store/appStore';

export function useTabContent() {
  const activeTab = useAppStore((state) => state.activeTab);
  return { activeTab };
}
