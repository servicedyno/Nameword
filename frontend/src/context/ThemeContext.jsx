import React, { createContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  // Light-first ("Editorial Indigo"). A saved preference wins after the one-time v2 reset.
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (!localStorage.getItem('nw_theme_v2')) {
      localStorage.setItem('nw_theme_v2', '1');
      localStorage.setItem('theme', 'light');
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'system') {
      systemMode();
    } else if (savedTheme === 'light' || savedTheme === 'dark') {
      setMode(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('light');
      localStorage.setItem('theme', 'light');
      setMode('light');
    }
  }, []);

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const darkMode = () => {
    applyTheme('dark');
    localStorage.setItem('theme', 'dark');
    setMode('dark');
  };

  const lightMode = () => {
    applyTheme('light');
    localStorage.setItem('theme', 'light');
    setMode('light');
  };

  const systemMode = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', 'system');
    setMode('system');
  };

  return (
    <ThemeContext.Provider value={{ mode, darkMode, lightMode, systemMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeContext, ThemeProvider };