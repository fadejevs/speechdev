'use client';
import PropTypes from 'prop-types';

import { createContext } from 'react';

// @project
import defaultConfig from '@/config';
import useLocalStorage from '@/hooks/useLocalStorage';

// @types

// @initial
// Remove i18n from config since locale switching is disabled
const { i18n, ...configWithoutI18n } = defaultConfig;

const initialState = {
  ...configWithoutI18n,
  onChangeCurrentTheme: () => {},
  onChangeThemeDirection: () => {},
  onChangeThemeMode: () => {}
};

/***************************  CONFIG - CONTEXT & PROVIDER  ***************************/

const ConfigContext = createContext(initialState);

function ConfigProvider({ children }) {
  const [config, setConfig] = useLocalStorage('sass-able-react-mui-admin-next-ts', initialState);

  const onChangeCurrentTheme = (currentTheme) => {
    setConfig({
      ...config,
      currentTheme
    });
  };

  const onChangeThemeDirection = (direction) => {
    setConfig({
      ...config,
      themeDirection: direction
    });
  };

  const onChangeThemeMode = (mode) => {
    setConfig({
      ...config,
      mode
    });
  };

  return (
    <ConfigContext.Provider
      value={{
        ...config,
        onChangeCurrentTheme,
        onChangeThemeDirection,
        onChangeThemeMode
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export { ConfigProvider, ConfigContext };

ConfigProvider.propTypes = { children: PropTypes.any };
