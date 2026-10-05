import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_BY_CODE,
  directionOf,
  isSupported,
  matchBrowserLanguage,
} from './languages';
import { safeStorage } from '../utils/storage';

const LANG_KEY = 'rdh.lang.v1';

type Bundle = Record<string, unknown>;

/** Lazy loaders. English is bundled; every other locale is its own chunk, fetched on demand. */
const FULL_LOADERS: Record<string, () => Promise<{ default: Bundle }>> = {
  'zh-CN': () => import('./locales/zh-CN.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
  ms: () => import('./locales/ms.json'),
  ar: () => import('./locales/ar.json'),
};

function unflatten(flat: Record<string, string>): Bundle {
  const out: Bundle = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let node = out;
    parts.slice(0, -1).forEach((p) => {
      node = (node[p] ??= {}) as Bundle;
    });
    node[parts[parts.length - 1]!] = value;
  }
  return out;
}

async function loadBundle(code: string): Promise<Bundle | null> {
  if (code === 'en') return null; // bundled
  const lang = LANGUAGE_BY_CODE.get(code);
  if (!lang) throw new Error(`Unsupported language: ${code}`);
  if (lang.coverage === 'fallback') return null; // uses fallbackTo
  const full = FULL_LOADERS[code];
  if (full) return (await full()).default;
  const { CORE_LOCALES } = await import('./locales/core');
  const flat = CORE_LOCALES[code];
  return flat ? unflatten(flat) : null;
}

/** Make sure every bundle in the fallback chain for `code` is registered. */
async function ensureLoaded(code: string): Promise<void> {
  const chain = [code, LANGUAGE_BY_CODE.get(code)?.fallbackTo].filter((c): c is string => !!c);
  for (const c of chain) {
    if (c === 'en' || i18n.hasResourceBundle(c, 'translation')) continue;
    const bundle = await loadBundle(c);
    if (bundle) i18n.addResourceBundle(c, 'translation', bundle, true, true);
  }
}

function applyDocumentLanguage(code: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = directionOf(code);
}

export function detectInitialLanguage(): string {
  const stored = safeStorage.get<string | null>(LANG_KEY, null);
  if (stored && isSupported(stored)) return stored;
  const tags = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const tag of tags) {
    const match = matchBrowserLanguage(tag);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Switch language. Resolves only after the new bundle is loaded; on failure it rejects and the
 * previous language stays active. Nothing outside i18n state (cart, order type, table, wizard)
 * is touched here, so switching never resets user progress.
 */
export async function setLanguage(code: string): Promise<void> {
  if (!isSupported(code)) throw new Error(`Unsupported language: ${code}`);
  await ensureLoaded(code);
  await i18n.changeLanguage(code);
  safeStorage.set(LANG_KEY, code);
  applyDocumentLanguage(code);
}

export async function initI18n(initial = detectInitialLanguage()): Promise<typeof i18n> {
  // Initialise with the bundled English first: resources can only be added to an initialised instance.
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: (code) => {
      const fb = LANGUAGE_BY_CODE.get(code)?.fallbackTo;
      return fb ? [fb, 'en'] : ['en'];
    },
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  try {
    await setLanguage(initial);
  } catch {
    // Language failed to load (offline, bad chunk): stay on English rather than blocking the app.
    applyDocumentLanguage(DEFAULT_LANGUAGE);
  }
  return i18n;
}

export default i18n;
