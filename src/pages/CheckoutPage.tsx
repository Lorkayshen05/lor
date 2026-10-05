import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CHECKOUT_CONFIG } from '../data/restaurant';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { normalizePhone, validateCheckout, type CheckoutErrors } from '../services/checkout';
import { Icon } from '../components/Icon';
import { OrderTypeToggle } from '../components/OrderTypeToggle';
import { Price } from '../components/Price';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (a: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => React.ReactNode;
}

function Field({ id, label, error, hint, children }: FieldProps) {
  const { t } = useTranslation();
  const describedBy = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field__error">
          {t(error)}
        </p>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderType, tableNumber, setTableNumber, totals, placeOrder } = useApp();
  const { nameOf } = useMenuText();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickup, setPickup] = useState<number>(0);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isDineIn = orderType === 'dine-in';

  // Field errors belong to the other order type's form; don't leave a banner pointing at fields that are gone.
  useEffect(() => {
    setErrors({});
    setFailed(false);
  }, [orderType]);

  if (totals.lines.length === 0 && !submitting) {
    return (
      <div className="container page">
        <h1 className="page__title">{t('checkout.title')}</h1>
        <div className="empty">
          <p className="empty__title">{t('errors.cartEmpty')}</p>
          <Link to="/menu" className="btn btn--primary">
            {t('cart.browse')}
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found = validateCheckout(
      { name, phone, tableNumber },
      orderType,
      totals.lines.length,
      totals.unavailable.length > 0,
    );
    setErrors(found);
    setFailed(false);
    if (Object.keys(found).length > 0) {
      const firstId = (['tableNumber', 'name', 'phone'] as const).find((k) => found[k]);
      if (firstId) formRef.current?.querySelector<HTMLElement>(`#f-${firstId}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const order = await placeOrder({ name: name.trim(), phone: normalizePhone(phone) }, { pickupInMinutes: pickup });
      navigate(`/confirmation/${encodeURIComponent(order.orderId)}`, { replace: true });
    } catch {
      setFailed(true);
      setSubmitting(false);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="container page checkout">
      <h1 className="page__title">{t('checkout.title')}</h1>
      <OrderTypeToggle />

      <form ref={formRef} onSubmit={onSubmit} noValidate className="checkout__form">
        <h2 className="menu-group__title">{t('checkout.details')}</h2>

        {errorCount > 0 && (
          <p className="form-error" role="alert">
            {errors.cart ? t(errors.cart) : t('checkout.fixErrors')}
          </p>
        )}

        {isDineIn ? (
          <>
            <Field id="f-tableNumber" label={t('checkout.tableNumber')} hint={t('checkout.tableHint')} error={errors.tableNumber}>
              {(a) => (
                <input
                  {...a}
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={6}
                  dir="ltr"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              )}
            </Field>
            <Field
              id="f-name"
              label={CHECKOUT_CONFIG.requireNameForDineIn ? t('checkout.name') : t('checkout.nameOptional')}
              error={errors.name}
            >
              {(a) => <input {...a} type="text" autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
          </>
        ) : (
          <>
            <Field id="f-name" label={t('checkout.name')} error={errors.name}>
              {(a) => <input {...a} type="text" autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field id="f-phone" label={t('checkout.phone')} hint={t('checkout.phoneHint')} error={errors.phone}>
              {(a) => (
                <input
                  {...a}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}
            </Field>
            <div className="field">
              <label htmlFor="f-pickup">{t('checkout.pickup')}</label>
              <select id="f-pickup" value={pickup} onChange={(e) => setPickup(Number(e.target.value))}>
                {CHECKOUT_CONFIG.pickupOptionsMinutes.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? t('checkout.pickupAsap') : t('checkout.pickupIn', { minutes: m })}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <h2 className="menu-group__title">{t('checkout.review')}</h2>
        <ul className="summary-lines">
          {totals.lines.map((l) => (
            <li key={l.item.id}>
              <span>
                {nameOf(l.item)} × {l.quantity}
              </span>
              <Price value={l.lineTotal} />
            </li>
          ))}
        </ul>
        <div className="totals__grand totals__row">
          <span>{t('common.total')}</span>
          <Price value={totals.total} />
        </div>

        {failed && (
          <div className="notice notice--warn" role="alert">
            <strong>{t('checkout.failedTitle')}</strong>
            <p>{t('checkout.failedBody')}</p>
          </div>
        )}

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
          {submitting ? t('checkout.placing') : failed ? t('common.retry') : t('checkout.place')}
          {!submitting && <Icon name="chevron" size={18} directional />}
        </button>
        <p className="muted small">{t('checkout.privacy')}</p>
        <Link to="/cart" className="btn btn--link">
          {t('common.back')}
        </Link>
      </form>
    </div>
  );
}
