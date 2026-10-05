import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OUTLETS } from '../../data/restaurant';
import { Icon } from '../Icon';
import { SectionHeading } from '../SectionHeading';

export function MixSection() {
  const { t } = useTranslation();
  return (
    <section className="section container" aria-labelledby="mix-title">
      <div className="feature">
        <h2 id="mix-title" className="feature__title">
          {t('mix.title')}
        </h2>
        <p>{t('mix.subtitle')}</p>
        <Link to="/discover?mode=plan" className="btn btn--gold">
          {t('mix.cta')}
          <Icon name="chevron" size={18} directional />
        </Link>
      </div>
    </section>
  );
}

export function StorySection() {
  const { t } = useTranslation();
  return (
    <section className="section container story" aria-labelledby="story-title">
      <SectionHeading id="story-title" title={t('story.title')} />
      <p className="story__body">{t('story.body')}</p>
    </section>
  );
}

export function LocationSection() {
  const { t } = useTranslation();
  return (
    <section className="section container" aria-labelledby="location-title">
      <SectionHeading id="location-title" title={t('location.title')} />
      {OUTLETS.length === 0 ? (
        <p className="muted">{t('location.pending')}</p>
      ) : (
        <ul className="outlets">
          {OUTLETS.map((o) => (
            <li key={o.id} className="panel">
              <h3>{o.name}</h3>
              <address>{o.address}</address>
              {o.hours && <p>{o.hours}</p>}
              {o.phone && (
                <p>
                  <a href={`tel:${o.phone}`} dir="ltr">
                    {o.phone}
                  </a>
                </p>
              )}
              {o.mapUrl && (
                <a className="link-arrow" href={o.mapUrl} target="_blank" rel="noreferrer">
                  {t('location.directions')}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
