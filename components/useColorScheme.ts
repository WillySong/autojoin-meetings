import { useEffect, useState } from 'react';
import { getPreferredScheme, watchScheme, type ColorScheme } from '@/lib/theme';

// Reactive Chrome color scheme — used by the overlay, which renders inside a
// shadow root and so applies the theme to its own wrapper element.
export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(getPreferredScheme);
  useEffect(() => watchScheme(setScheme), []);
  return scheme;
}
