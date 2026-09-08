import React, { createContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  // Dark ("Midnight Vault") is the default. A saved preference always wins.
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'system') {
      systemMode();
    } else if (savedTheme === 'light' || savedTheme === 'dark') {
      setMode(savedTheme);
      applyTheme(savedTheme);
    } else {
      // first visit -> dark by default
      applyTheme('dark');
      localStorage.setItem('theme', 'dark');
      setMode('dark');
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