import { useAppStore } from '../../store/appStore';
import { useTabCounts } from './useTabCounts';

export function useBottomTabBar() {
  const activeTab = useAppStore((state) => state.activeTab);
  const onSelectTab = useAppStore((state) => state.setActiveTab);
  return { activeTab, onSelectTab, ...useTabCounts() };
}
