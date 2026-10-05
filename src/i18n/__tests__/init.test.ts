import { vi } from 'vitest';

describe('startup language restore (fresh page load)', () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  });

  it('restores a saved RTL language on reload, with html lang/dir set', async () => {
    window.localStorage.setItem('rdh.lang.v1', JSON.stringify('ar'));
    const { initI18n, default: i18n } = await import('..');
    await initI18n();
    expect(i18n.language).toBe('ar');
    expect(i18n.t('nav.cart')).toBe('السلة');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('restores a core language and a Cantonese→zh-TW fallback chain', async () => {
    window.localStorage.setItem('rdh.lang.v1', JSON.stringify('yue'));
    const { initI18n, default: i18n } = await import('..');
    await initI18n();
    expect(i18n.language).toBe('yue');
    expect(i18n.t('nav.menu')).toBe('餐牌');
    expect(i18n.t('cart.empty')).toBe('購物車是空的。');
  });

  it('falls back to English for an unsupported saved value', async () => {
    window.localStorage.setItem('rdh.lang.v1', JSON.stringify('klingon'));
    const { initI18n, default: i18n } = await import('..');
    await initI18n();
    expect(i18n.language).toBe('en');
  });
});
