// @next
import { Archivo, Figtree, Roboto } from 'next/font/google';

// @project
import { AuthType } from '@/enum';

/***************************  THEME CONSTANT  ***************************/

export const APP_DEFAULT_PATH = '/dashboard/analytics';
export const APP_SUPPORT_PATH = 'https://phoenixcoded.authordesk.app/';

export const DRAWER_WIDTH = 254;
export const MINI_DRAWER_WIDTH = 76 + 1; // 1px - for right-side border

/***************************  AUTH CONSTANT  ***************************/

export const AUTH_USER_KEY = 'auth-user';
export const AUTH_PROVIDER = AuthType.MOCK;

/***************************  THEME ENUM  ***************************/

export let Themes;

(function (Themes) {
  Themes['THEME_CRM'] = 'crm';
  Themes['THEME_AI'] = 'ai';
  Themes['THEME_HOSTING'] = 'hosting';
})(Themes || (Themes = {}));

export let ThemeMode;

(function (ThemeMode) {
  ThemeMode['LIGHT'] = 'light';
  ThemeMode['DARK'] = 'dark';
})(ThemeMode || (ThemeMode = {}));

export let ThemeDirection;

(function (ThemeDirection) {
  ThemeDirection['LTR'] = 'ltr';
  ThemeDirection['RTL'] = 'rtl';
})(ThemeDirection || (ThemeDirection = {}));

export let ThemeI18n;

(function (ThemeI18n) {
  ThemeI18n['EN'] = 'en';
  ThemeI18n['FR'] = 'fr';
  ThemeI18n['RO'] = 'ro';
  ThemeI18n['ZH'] = 'zh';
})(ThemeI18n || (ThemeI18n = {}));

/***************************  CONFIG  ***************************/

const config = {
  currentTheme: Themes.THEME_HOSTING,
  mode: ThemeMode.LIGHT,
  themeDirection: ThemeDirection.LTR,
  miniDrawer: false,
  i18n: ThemeI18n.EN
};

export default config;

/***************************  THEME - FONT FAMILY  ***************************/

const fontRobot = Roboto({ subsets: ['latin'], display: 'swap', weight: ['100', '300', '400', '500', '700', '900'] });
const fontArchivo = Archivo({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700'] });
const fontFigtree = Figtree({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700'] });

export const FONT_ROBOTO = fontRobot.style.fontFamily;
export const FONT_ARCHIVO = fontArchivo.style.fontFamily;
export const FONT_FIGTREE = fontFigtree.style.fontFamily;
