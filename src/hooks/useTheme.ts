import { COLORS, PREMIUM_COLORS, AppColors } from '../utils/constants';
import usePremiumStore from '../store/premium.store';

export const useTheme = (): AppColors => {
  const isPremium = usePremiumStore((s) => s.isPremium);
  return isPremium ? PREMIUM_COLORS : COLORS;
};
