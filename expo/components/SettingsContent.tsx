import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlugInfo } from '@/plugins/PluginManager';
import plugArray from '@/plugins';

const plugins: PlugInfo[] = plugArray();

// Use a record type to make storing settings easier
export interface Settings {
  enabled: { [key: string]: boolean };
}

// enable all plugins by default
const initialEnabled: { [key: string]: boolean } = {};
plugins.forEach((plugin) => {
  initialEnabled[plugin.title] = true;
});

interface SettingsContextValue {
  settings: Settings;
  updateSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: { enabled: initialEnabled },
  updateSetting: () => { },
});

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<Settings>({
    enabled: initialEnabled
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem('appSettings');
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings) as Settings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    };

    saveSettings();
  }, [settings]);

  const updateSetting = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => useContext(SettingsContext);
