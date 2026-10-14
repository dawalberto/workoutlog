import { useAppStore } from '../../store/appStore';
import { useTabCounts } from './useTabCounts';

export function useAppHeader() {
  const activeTab = useAppStore((state) => state.activeTab);
  const onSelectTab = useAppStore((state) => state.setActiveTab);
  const onOpenMenu = useAppStore((state) => state.openMenu);
  const { routinesCount, catalogCount } = useTabCounts();

  return { activeTab, onSelectTab, onOpenMenu, routinesCount, catalogCount };
}
