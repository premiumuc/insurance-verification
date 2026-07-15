import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from '@/theme/tokens';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
