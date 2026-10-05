import type { Language } from '../types';

/**
 * The 50 supported languages. `coverage` is honest about what ships today:
 *  - full:     complete UI translation
 *  - core:     key flows translated; everything else falls back to English
 *  - fallback: no own strings; shows another locale
 * `verified` stays false until a native speaker has reviewed the strings.
 * Cantonese and Hokkien are flagged `needsValidation` — they require specialist review
 * (written Cantonese conventions; Hokkien has no standard orthography).
 */
const L = (
  code: string,
  nativeName: string,
  englishName: string,
  coverage: Language['coverage'],
  extra: Partial<Language> = {},
): Language => ({ code, nativeName, englishName, dir: 'ltr', coverage, verified: false, ...extra });

export const LANGUAGES: readonly Language[] = [
  L('en', 'English', 'English', 'full', { verified: true }),
  L('zh-CN', '简体中文', 'Chinese (Simplified)', 'full'),
  L('zh-TW', '繁體中文', 'Chinese (Traditional)', 'full'),
  L('ms', 'Bahasa Melayu', 'Malay', 'full'),
  L('id', 'Bahasa Indonesia', 'Indonesian', 'core'),
  L('yue', '粵語', 'Cantonese', 'core', { needsValidation: true, fallbackTo: 'zh-TW' }),
  L('nan', '閩南語 (Hokkien)', 'Hokkien', 'fallback', { needsValidation: true, fallbackTo: 'zh-TW' }),
  L('ja', '日本語', 'Japanese', 'core'),
  L('ko', '한국어', 'Korean', 'core'),
  L('th', 'ไทย', 'Thai', 'core'),
  L('vi', 'Tiếng Việt', 'Vietnamese', 'core'),
  L('ta', 'தமிழ்', 'Tamil', 'core'),
  L('hi', 'हिन्दी', 'Hindi', 'core'),
  L('bn', 'বাংলা', 'Bengali', 'core'),
  L('ur', 'اردو', 'Urdu', 'core', { dir: 'rtl' }),
  L('pa', 'ਪੰਜਾਬੀ', 'Punjabi', 'core'),
  L('gu', 'ગુજરાતી', 'Gujarati', 'core'),
  L('te', 'తెలుగు', 'Telugu', 'core'),
  L('mr', 'मराठी', 'Marathi', 'core'),
  L('kn', 'ಕನ್ನಡ', 'Kannada', 'core'),
  L('ml', 'മലയാളം', 'Malayalam', 'core'),
  L('fil', 'Filipino', 'Filipino', 'core'),
  L('ar', 'العربية', 'Arabic', 'full', { dir: 'rtl' }),
  L('fa', 'فارسی', 'Persian', 'core', { dir: 'rtl' }),
  L('he', 'עברית', 'Hebrew', 'core', { dir: 'rtl' }),
  L('fr', 'Français', 'French', 'core'),
  L('de', 'Deutsch', 'German', 'core'),
  L('es', 'Español', 'Spanish', 'core'),
  L('it', 'Italiano', 'Italian', 'core'),
  L('pt', 'Português', 'Portuguese', 'core'),
  L('nl', 'Nederlands', 'Dutch', 'core'),
  L('ru', 'Русский', 'Russian', 'core'),
  L('uk', 'Українська', 'Ukrainian', 'core'),
  L('pl', 'Polski', 'Polish', 'core'),
  L('cs', 'Čeština', 'Czech', 'core'),
  L('sk', 'Slovenčina', 'Slovak', 'core'),
  L('hu', 'Magyar', 'Hungarian', 'core'),
  L('ro', 'Română', 'Romanian', 'core'),
  L('el', 'Ελληνικά', 'Greek', 'core'),
  L('tr', 'Türkçe', 'Turkish', 'core'),
  L('sw', 'Kiswahili', 'Swahili', 'core'),
  L('km', 'ខ្មែរ', 'Khmer', 'core'),
  L('lo', 'ລາວ', 'Lao', 'core'),
  L('my', 'မြန်မာ', 'Burmese', 'core'),
  L('si', 'සිංහල', 'Sinhala', 'core'),
  L('ne', 'नेपाली', 'Nepali', 'core'),
  L('da', 'Dansk', 'Danish', 'core'),
  L('sv', 'Svenska', 'Swedish', 'core'),
  L('no', 'Norsk', 'Norwegian', 'core'),
  L('fi', 'Suomi', 'Finnish', 'core'),
];

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_BY_CODE: ReadonlyMap<string, Language> = new Map(LANGUAGES.map((l) => [l.code, l]));

export const isSupported = (code: string): boolean => LANGUAGE_BY_CODE.has(code);
export const directionOf = (code: string) => LANGUAGE_BY_CODE.get(code)?.dir ?? 'ltr';

/** Map a browser locale (e.g. "zh-Hant-MY", "ms-MY", "nb") to a supported code. */
export function matchBrowserLanguage(tag: string): string | null {
  if (isSupported(tag)) return tag;
  const lower = tag.toLowerCase();
  if (lower.startsWith('zh')) {
    return /hant|tw|hk|mo/.test(lower) ? 'zh-TW' : 'zh-CN';
  }
  if (lower === 'nb' || lower === 'nn') return 'no';
  if (lower === 'tl') return 'fil';
  const base = lower.split('-')[0] ?? '';
  return isSupported(base) ? base : null;
}
