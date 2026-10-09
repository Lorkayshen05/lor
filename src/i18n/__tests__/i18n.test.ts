import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';
import zhTW from '../locales/zh-TW.json';
import ms from '../locales/ms.json';
import ar from '../locales/ar.json';
import { CORE_KEYS, CORE_LOCALES, CORE_ROWS } from '../locales/core';
import { LANGUAGES, LANGUAGE_BY_CODE, matchBrowserLanguage, directionOf } from '../languages';
import { MENU } from '../../data/menu';
import i18n, { initI18n, setLanguage } from '..';

type Tree = { [k: string]: string | Tree };
const flatten = (t: Tree, prefix = ''): string[] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : flatten(v, `${prefix}${k}.`)));
const enKeys = new Set(flatten(en as Tree));

describe('language registry', () => {
  it('declares exactly 50 unique languages including the required set', () => {
    expect(LANGUAGES).toHaveLength(50);
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(50);
    for (const code of ['en', 'zh-CN', 'zh-TW', 'ms', 'id', 'yue', 'nan', 'ja', 'ko', 'ta', 'ar', 'fa', 'he', 'fi', 'no']) {
      expect(LANGUAGE_BY_CODE.has(code)).toBe(true);
    }
  });
  it('marks right-to-left languages (Arabic, Persian, Hebrew, Urdu)', () => {
    expect(LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code).sort()).toEqual(['ar', 'fa', 'he', 'ur']);
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
  });
  it('does not claim verification it cannot back; flags Cantonese and Hokkien for validation', () => {
    expect(LANGUAGES.filter((l) => l.verified).map((l) => l.code)).toEqual(['en']);
    expect(LANGUAGE_BY_CODE.get('yue')!.needsValidation).toBe(true);
    expect(LANGUAGE_BY_CODE.get('nan')!.needsValidation).toBe(true);
  });
  it('maps browser locales to supported codes', () => {
    expect(matchBrowserLanguage('zh-Hant-MY')).toBe('zh-TW');
    expect(matchBrowserLanguage('zh-CN')).toBe('zh-CN');
    expect(matchBrowserLanguage('ms-MY')).toBe('ms');
    expect(matchBrowserLanguage('nb')).toBe('no');
    expect(matchBrowserLanguage('xx')).toBeNull();
  });
});

describe('locale files', () => {
  it.each([
    ['zh-CN', zhCN],
    ['zh-TW', zhTW],
    ['ms', ms],
    ['ar', ar],
  ])('%s has every UI key English has (no silent English fallbacks) and no stray keys', (_c, bundle) => {
    const keys = new Set(flatten(bundle as Tree).filter((k) => !k.startsWith('dish.')));
    expect([...enKeys].filter((k) => !keys.has(k))).toEqual([]);
    expect([...keys].filter((k) => !enKeys.has(k))).toEqual([]);
  });
  it.each([['zh-CN', zhCN], ['zh-TW', zhTW], ['ms', ms], ['ar', ar]])('%s translates every dish name', (_c, bundle) => {
    const dish = (bundle as unknown as { dish: Record<string, { name: string }> }).dish;
    for (const m of MENU) expect(dish[m.id]?.name, m.id).toBeTruthy();
  });
  it('core locales cover the declared key list and every declared core language', () => {
    for (const k of CORE_KEYS) expect(enKeys.has(k), k).toBe(true);
    for (const l of LANGUAGES.filter((x) => x.coverage === 'core')) {
      expect(CORE_ROWS[l.code], l.code).toBeDefined();
    }
    for (const [code, row] of Object.entries(CORE_ROWS)) {
      expect(row, code).toHaveLength(CORE_KEYS.length);
      expect(row.every((s) => s.trim().length > 0), code).toBe(true);
      expect(Object.keys(CORE_LOCALES[code]!)).toHaveLength(CORE_KEYS.length);
    }
  });
  it('every translation key used in source exists in the English file', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) f !== '__tests__' && f !== 'locales' && walk(p);
        else if (/\.(ts|tsx)$/.test(f)) files.push(p);
      }
    };
    walk(join(__dirname, '../..'));
    const re = /'((?:app|nav|orderType|common|guide|hero|labels|firstTime|welcomeBack|signatures|tryNew|mix|story|location|menu|filters|category|flavour|product|cart|checkout|confirmation|status|orders|wizard|reasons|planner|discover|language|errors)\.[A-Za-z.]+)'/g;
    const missing: string[] = [];
    for (const file of files) {
      for (const m of readFileSync(file, 'utf8').matchAll(re)) {
        if (!enKeys.has(m[1]!)) missing.push(`${file.split('/src/')[1]}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('language switching', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  it('switches language, updates <html lang/dir>, and falls back to English for missing keys', async () => {
    await setLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(i18n.t('nav.cart')).toBe('السلة');
    await setLanguage('fi'); // core language: translated nav, English fallback elsewhere
    expect(document.documentElement.dir).toBe('ltr');
    expect(i18n.t('nav.cart')).toBe('Ostoskori');
    expect(i18n.t('wizard.title')).toBe(en.wizard.title);
  });
  it('Hokkien/Cantonese fall back to Traditional Chinese rather than English', async () => {
    await setLanguage('nan');
    expect(i18n.t('nav.cart')).toBe('購物車');
    await setLanguage('yue');
    expect(i18n.t('hero.orderNow')).toBe('即刻落單');
    expect(i18n.t('nav.menu')).toBe('餐牌');
    expect(i18n.t('cart.empty')).toBe('購物車是空的。'); // from zh-TW fallback
  });
  it('rejects unsupported languages and keeps the current one', async () => {
    await setLanguage('en');
    await expect(setLanguage('xx')).rejects.toThrow();
    expect(i18n.language).toBe('en');
  });
});
