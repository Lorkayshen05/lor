import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../state/AppContext';
import { useMenuText } from '../../hooks/useMenuText';
import { getFirstVisitCombo } from '../../services/recommendations';
import { getUnitPrice } from '../../services/pricing';
import { AddAllButton } from '../AddAllButton';
import { DishImage } from '../DishImage';
import { SecondaryName } from '../SecondaryName';
import { Price } from '../Price';
import { SectionHeading } from '../SectionHeading';

/** "FIRST TIME HERE?" — a starter order built from real menu items, priced for the current order type. */
export function FirstTimeSection() {
  const { t } = useTranslation();
  const { menu, orderType } = useApp();
  const { nameOf } = useMenuText();
  const combo = useMemo(() => getFirstVisitCombo(menu, orderType), [menu, orderType]);
  if (combo.lines.length === 0) return null;

  return (
    <section className="section container" aria-labelledby="first-time-title">
      <SectionHeading id="first-time-title" title={t('firstTime.title')} subtitle={t('firstTime.subtitle')} />
      <div className="combo">
        <p className="combo__title">{t('firstTime.comboTitle')}</p>
        <ul className="combo__list">
          {combo.lines.map(({ role, item }, i) => (
            <li key={item.id} className="combo__row">
              <span className="combo__plus" aria-hidden="true">
                {i === 0 ? '' : '+'}
              </span>
              <DishImage src={item.image} alt="" className="combo__img" />
              <span className="combo__text">
                <span className="combo__role">{t(`firstTime.role.${role}`)}</span>
                <Link to={`/menu/${item.id}`} className="combo__name">
                  {nameOf(item)}
                </Link>
                <SecondaryName item={item} as="span" className="combo__zh" />
              </span>
              <Price value={getUnitPrice(item, orderType)} />
            </li>
          ))}
        </ul>
        <div className="combo__total">
          <span>{t('common.total')}</span>
          <Price value={combo.total} className="combo__total-price" />
        </div>
        <AddAllButton items={combo.items.map((m) => ({ itemId: m.id, quantity: 1 }))} label={t('firstTime.addCombo')} />
        <Link to="/menu?filter=first-time" className="link-arrow">
          {t('firstTime.picksTitle')}
        </Link>
      </div>
    </section>
  );
}
