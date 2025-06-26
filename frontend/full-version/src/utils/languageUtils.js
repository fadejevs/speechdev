/**
 * Language utilities for handling language codes and formats
 */

// Map of language codes to their standardized formats for different services
const languageFormats = {
  // Speech recognition formats (Azure)
  speechRecognition: {
    // English variants
    'en': 'en-US',
    'en-us': 'en-US',
    'en-gb': 'en-GB',
    'english': 'en-US',
    
    // Other languages with Azure speech recognition support
    'ar': 'ar-AE',
    'ca': 'ca-ES',
    'cs': 'cs-CZ',
    'da': 'da-DK',
    'de': 'de-DE',
    'es': 'es-ES',
    'fi': 'fi-FI',
    'fr': 'fr-FR',
    'hi': 'hi-IN',
    'it': 'it-IT',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'nl': 'nl-NL',
    'no': 'nb-NO',
    'pl': 'pl-PL',
    'pt': 'pt-BR',
    'ru': 'ru-RU',
    'sv': 'sv-SE',
    'th': 'th-TH',
    'tr': 'tr-TR',
    'zh': 'zh-CN',
    
    // Baltic languages
    'lv': 'lv-LV',
    'lt': 'lt-LT',
    'et': 'et-EE',
    
    // Other European languages
    'bg': 'bg-BG',
    'hr': 'hr-HR',
    'hu': 'hu-HU',
    'ro': 'ro-RO',
    'sk': 'sk-SK',
    'sl': 'sl-SI',
    'uk': 'uk-UA',
  },
  
  // Translation formats (DeepL)
  translation: {
    // Source languages
    'en': 'EN',
    'en-us': 'EN-US',
    'en-gb': 'EN-GB',
    'english': 'EN',
    
    'de': 'DE',
    'fr': 'FR',
    'es': 'ES',
    'it': 'IT',
    'nl': 'NL',
    'pl': 'PL',
    'pt': 'PT',
    'ru': 'RU',
    'ja': 'JA',
    'zh': 'ZH',
    
    // Target languages
    'bulgarian': 'BG',
    'czech': 'CS',
    'danish': 'DA',
    'german': 'DE',
    'greek': 'EL',
    'english': 'EN',
    'spanish': 'ES',
    'estonian': 'ET',
    'finnish': 'FI',
    'french': 'FR',
    'hungarian': 'HU',
    'indonesian': 'ID',
    'italian': 'IT',
    'japanese': 'JA',
    'korean': 'KO',
    'lithuanian': 'LT',
    'latvian': 'LV',
    'norwegian': 'NB',
    'dutch': 'NL',
    'polish': 'PL',
    'portuguese': 'PT',
    'romanian': 'RO',
    'russian': 'RU',
    'slovak': 'SK',
    'slovenian': 'SL',
    'swedish': 'SV',
    'turkish': 'TR',
    'ukrainian': 'UK',
    'chinese': 'ZH',
  }
};

/**
 * Format a language code for speech recognition
 * @param {string} languageCode - The language code to format
 * @returns {string} - The formatted language code
 */
export const formatForSpeechRecognition = (languageCode) => {
  if (!languageCode) return 'en-US';
  
  const normalized = languageCode.toLowerCase();
  
  // Check if we have a direct mapping
  if (languageFormats.speechRecognition[normalized]) {
    return languageFormats.speechRecognition[normalized];
  }
  
  // If it's already in the correct format (e.g., 'en-US'), return as is
  if (/^[a-z]{2}-[A-Z]{2}$/.test(languageCode)) {
    return languageCode;
  }
  
  // Default fallback
  console.warn(`No speech recognition mapping for language code: ${languageCode}, falling back to en-US`);
  return 'en-US';
};

/**
 * Format a language code for translation (source language)
 * @param {string} languageCode - The language code to format
 * @returns {string} - The formatted language code
 */
export const formatForTranslationSource = (languageCode) => {
  if (!languageCode) return 'EN';
  
  const normalized = languageCode.toLowerCase();
  
  // Check if we have a direct mapping
  if (languageFormats.translation[normalized]) {
    return languageFormats.translation[normalized];
  }
  
  // If it's a two-letter code, uppercase it (DeepL format)
  if (/^[a-z]{2}$/.test(normalized)) {
    return normalized.toUpperCase();
  }
  
  // If it's in the format 'en-US', take the first part and uppercase it
  if (/^[a-z]{2}-[a-z]{2}$/i.test(languageCode)) {
    return languageCode.split('-')[0].toUpperCase();
  }
  
  // Default fallback
  console.warn(`No translation source mapping for language code: ${languageCode}, falling back to EN`);
  return 'EN';
};

/**
 * Format a language code for translation (target language)
 * @param {string} languageCode - The language code to format
 * @returns {string} - The formatted language code
 */
export const formatForTranslationTarget = (languageCode) => {
  if (!languageCode) return 'EN';
  
  const normalized = languageCode.toLowerCase();
  
  // Check if we have a direct mapping
  if (languageFormats.translation[normalized]) {
    return languageFormats.translation[normalized];
  }
  
  // Special handling for English variants that should be preserved
  if (normalized === 'en-us' || languageCode === 'EN-US') {
    return 'EN-US';
  }
  if (normalized === 'en-gb' || languageCode === 'EN-GB') {
    return 'EN-GB';
  }
  
  // If it's already in DeepL format (e.g., 'EN-US', 'EN-GB'), return as is
  if (/^[A-Z]{2}(-[A-Z]{2})?$/.test(languageCode)) {
    return languageCode;
  }
  
  // If it's a two-letter code, uppercase it (DeepL format)
  if (/^[a-z]{2}$/.test(normalized)) {
    return normalized.toUpperCase();
  }
  
  // If it's in the format 'en-US', convert to DeepL format
  if (/^[a-z]{2}-[a-z]{2}$/i.test(languageCode)) {
    return languageCode.toUpperCase();
  }
  
  // Default fallback
  console.warn(`No translation target mapping for language code: ${languageCode}, falling back to EN`);
  return 'EN';
};

/**
 * Get the display name for a language code
 * @param {string} languageCode - The language code
 * @returns {string} - The display name
 */
export const getLanguageDisplayName = (languageCode) => {
  if (!languageCode) return 'Unknown';
  
  const languageNames = {
    'en': 'English',
    'en-us': 'English (US)',
    'en-gb': 'English (UK)',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'it': 'Italian',
    'nl': 'Dutch',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'bg': 'Bulgarian',
    'cs': 'Czech',
    'da': 'Danish',
    'el': 'Greek',
    'et': 'Estonian',
    'fi': 'Finnish',
    'hu': 'Hungarian',
    'id': 'Indonesian',
    'ko': 'Korean',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'nb': 'Norwegian',
    'ro': 'Romanian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'sv': 'Swedish',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
  };
  
  const normalized = languageCode.toLowerCase();
  
  if (languageNames[normalized]) {
    return languageNames[normalized];
  }
  
  // If it's in the format 'en-US', try to look up the first part
  if (normalized.includes('-')) {
    const baseLang = normalized.split('-')[0];
    if (languageNames[baseLang]) {
      return languageNames[baseLang];
    }
  }
  
  // If we can't find a name, return the code itself
  return languageCode;
}; 