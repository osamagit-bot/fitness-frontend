import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Apply theme to document root
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    // Theme classes for easy use
    classes: {
      // Background classes
      bg: {
        primary: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        secondary: isDarkMode ? 'bg-gray-800' : 'bg-gray-100',
        tertiary: isDarkMode ? 'bg-gray-700' : 'bg-gray-200',
        card: isDarkMode ? 'bg-gray-800' : 'bg-gray-100',
        navbar: isDarkMode ? 'bg-gray-900/95' : 'bg-gray-200/95',
        hero: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
      },
      // Text classes
      text: {
        primary: isDarkMode ? 'text-white' : 'text-gray-900',
        secondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
        tertiary: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        accent: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
        muted: isDarkMode ? 'text-gray-500' : 'text-gray-400',
      },
      // Border classes
      border: {
        primary: isDarkMode ? 'border-gray-700' : 'border-gray-200',
        secondary: isDarkMode ? 'border-gray-600' : 'border-gray-300',
        accent: isDarkMode ? 'border-yellow-500' : 'border-yellow-400',
      },
      // Button classes
      button: {
        primary: isDarkMode 
          ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
          : 'bg-yellow-600 hover:bg-yellow-700 text-white',
        secondary: isDarkMode 
          ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
          : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
        outline: isDarkMode 
          ? 'border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black' 
          : 'border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white',
      },
      // Input classes
      input: {
        primary: isDarkMode 
          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500' 
          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-yellow-500',
      },
      // Card classes
      card: {
        primary: isDarkMode 
          ? 'bg-gray-800 border-gray-700 shadow-lg' 
          : 'bg-gray-100 border-gray-200 shadow-lg',
        hover: isDarkMode 
          ? 'hover:bg-gray-700 hover:border-gray-600' 
          : 'hover:bg-gray-100 hover:border-gray-300',
      },
      // Dropdown classes
      dropdown: {
        primary: isDarkMode 
          ? 'bg-gray-800 border-gray-700 shadow-xl' 
          : 'bg-gray-100 border-gray-200 shadow-lg',
        item: isDarkMode 
          ? 'text-gray-300 hover:bg-gray-700 hover:text-yellow-400' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-yellow-600',
      }
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};