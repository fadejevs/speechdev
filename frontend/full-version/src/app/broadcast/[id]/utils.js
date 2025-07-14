export const languageMap = {
  en: 'English',
  lv: 'Latvian',
  lt: 'Lithuanian',
  ru: 'Russian',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  pt: 'Portuguese',
  nl: 'Dutch',
  sv: 'Swedish',
  fi: 'Finnish',
  da: 'Danish',
  no: 'Norwegian',
  pl: 'Polish',
  tr: 'Turkish',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  bg: 'Bulgarian',
  el: 'Greek',
  he: 'Hebrew',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  uk: 'Ukrainian',
  sk: 'Slovak',
  sl: 'Slovenian',
  sr: 'Serbian',
  hr: 'Croatian',
  et: 'Estonian'
};
export const getFullLanguageName = (code = '') => languageMap[code.toLowerCase()] || code;
export const getLanguageCode = (full = '') => {
  const entry = Object.entries(languageMap).find(([, name]) => name === full);
  return entry ? entry[0] : full;
};
export const getBaseLangCode = (code) => (code ? code.split(/[-_]/)[0].toLowerCase() : code);

export const placeholderText = {
  en: 'Waiting for live translation...',
  lv: 'Gaida tiešraides tulkojumu...',
  lt: 'Laukiama tiesioginės transliacijos...',
  ru: 'Ожидание прямого перевода...',
  de: 'Warten auf Live-Übersetzung...',
  fr: 'En attente de traduction en direct...',
  es: 'Esperando traducción en vivo...',
  it: 'In attesa di traduzione dal vivo...',
  zh: '等待实时翻译...',
  ja: 'ライブ翻訳を待っています...',
  ko: '실시간 번역을 기다리는 중...',
  ar: 'في انتظار الترجمة المباشرة...',
  hi: 'लाइव अनुवाद की प्रतीक्षा में...',
  pt: 'Aguardando tradução ao vivo...',
  nl: 'Wachten op live vertaling...',
  sv: 'Väntar på direktöversättning...',
  fi: 'Odotetaan reaaliaikaista käännöstä...',
  da: 'Venter på direkte oversættelse...',
  no: 'Venter på direkteoversettelse...',
  pl: 'Oczekiwanie na tłumaczenie na żywo...',
  tr: 'Canlı çeviri bekleniyor...',
  cs: 'Čekání na živý překlad...',
  hu: 'Várakozás az élő fordításra...',
  ro: 'Se așteaptă traducerea în direct...',
  bg: 'Изчакване на превод на живо...',
  el: 'Αναμονή για ζωντανή μετάφραση...',
  he: 'ממתין לתרגום חי...',
  th: 'รอการแปลสด...',
  vi: 'Đang chờ bản dịch trực tiếp...',
  id: 'Menunggu terjemahan langsung...',
  ms: 'Menunggu terjemahan langsung...',
  uk: 'Очікування прямого перекладу...',
  sk: 'Čaká sa na živý preklad...',
  sl: 'Čakanje na živ prevod...',
  sr: 'Čekanje na uživo prevod...',
  hr: 'Čekanje na uživo prijevod...',
  et: 'Ootame reaalajas tõlget...'
};

export const getPlaceholderText = (translationLanguage) => {
  if (!translationLanguage) return placeholderText.en; // Default to English
  const langCode = getBaseLangCode(getLanguageCode(translationLanguage));
  return placeholderText[langCode] || placeholderText.en; // Fallback to English
};

export const isSafari = () => {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroidTablet = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
};

export const isTablet = () => {
  if (typeof navigator === 'undefined') return false;
  return isIOS() || isAndroidTablet() || /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Kindle|Silk/i.test(navigator.userAgent);
};

export const isMobile = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || isTablet(); // Include tablets in mobile category for TTS handling
};

export const createSilentAudioBlob = () => {
  const arrayBuffer = new ArrayBuffer(78);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 70, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 22050, true);
  view.setUint32(28, 22050, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(36, 'data');
  view.setUint32(40, 34, true);

  for (let i = 44; i < 78; i++) {
    view.setUint8(i, 128);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

export const playSilentAudio = () => {
  if (typeof window === 'undefined' || !isMobile()) return;
  console.log('[Audio Keep-Alive] Pinging audio session...');
  const silentBlob = createSilentAudioBlob();
  const audioUrl = URL.createObjectURL(silentBlob);
  const audio = new Audio(audioUrl);
  audio.volume = 0;
  audio.play().catch(() => {});
  setTimeout(() => { try { URL.revokeObjectURL(audioUrl); } catch {} }, 1000);
};

export const initializeAudioContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    const audioContext = new AudioContext();

    console.log('[Audio Context] Created with state:', audioContext.state);

    return audioContext;
  } catch (error) {
    console.warn('[Audio Context] Failed to initialize:', error);
    return null;
  }
};
