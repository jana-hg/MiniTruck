import { useTheme } from '../../context/ThemeContext';

export default function AppIcon({ size = 38 }) {
  const { isDark } = useTheme();
  return (
    <img
      src={isDark ? '/truck-dark.svg' : '/truck-light.svg'}
      alt="MiniTruck"
      style={{ width: size, height: size, borderRadius: size * 0.26, flexShrink: 0 }}
    />
  );
}
