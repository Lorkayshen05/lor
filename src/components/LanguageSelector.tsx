import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LANGUAGE_BY_CODE } from '../i18n/languages';
import { setLanguage } from '../i18n';
import { normalizeText } from '../services/search';
import { Icon } from './Icon';

/**
 * Searchable language picker. Bottom sheet on phones, centred dialog on larger screens.
 * Switching only touches i18n + <html lang/dir>; app state (cart, table, order type, wizard) is untouched.
 */
export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const current = LANGUAGE_BY_CODE.get(i18n.language);

  const close = () => {
    setOpen(false);
    setQuery('');
    setError('');
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('is-locked');
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('is-locked');
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const results = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return LANGUAGES;
    return LANGUAGES.filter((l) => normalizeText(`${l.nativeName} ${l.englishName} ${l.code}`).includes(q));
  }, [query]);

  const choose = async (code: string) => {
    if (code === i18n.language) return close();
    setBusy(code);
    setError('');
    try {
      await setLanguage(code);
      close();
    } catch {
      setError(t('language.loadFailed', { language: current?.nativeName ?? 'English' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="lang-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${t('language.label')}: ${current?.nativeName ?? ''}`}
      >
        <Icon name="globe" size={20} />
        <span className="lang-btn__label" lang={i18n.language}>
          {current?.nativeName}
        </span>
      </button>

      {open &&
        createPortal(
        <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="lang-title">
            <div className="sheet__head">
              <h2 id="lang-title">{t('language.choose')}</h2>
              <button type="button" className="icon-btn" onClick={close} aria-label={t('common.close')}>
                <Icon name="close" />
              </button>
            </div>
            <div className="sheet__search">
              <Icon name="search" size={18} />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('language.search')}
                aria-label={t('language.search')}
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <ul className="sheet__list">
              {results.length === 0 && <li className="sheet__empty">{t('language.noMatch', { query })}</li>}
              {results.map((l) => {
                const isCurrent = l.code === i18n.language;
                return (
                  <li key={l.code}>
                    <button
                      type="button"
                      className={`lang-row ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => choose(l.code)}
                      disabled={busy !== null}
                      aria-current={isCurrent || undefined}
                    >
                      <span className="lang-row__names">
                        <span className="lang-row__native" lang={l.code} dir={l.dir}>
                          {l.nativeName}
                        </span>
                        <span className="lang-row__en">{l.englishName}</span>
                      </span>
                      <span className="lang-row__meta">
                        {l.needsValidation ? (
                          <span className="badge">{t('language.needsReview')}</span>
                        ) : l.coverage !== 'full' ? (
                          <span className="badge">{t('language.partial')}</span>
                        ) : null}
                        {busy === l.code ? (
                          <span>{t('common.loading')}</span>
                        ) : (
                          isCurrent && <Icon name="check" size={18} aria-label={t('language.current')} />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="sheet__note">{t('language.notVerified')}</p>
          </div>
        </div>,
        document.body,
        )}
    </>
  );
}
