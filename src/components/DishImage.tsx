import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

/** Fixed aspect ratio (no layout shift), lazy by default, with a readable fallback if the file fails. */
export function DishImage({ src, alt, className = '', eager = false }: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`dish-image dish-image--failed ${className}`} role="img" aria-label={alt}>
        <span>{t('common.imageFailed')}</span>
      </div>
    );
  }
  return (
    <img
      className={`dish-image ${className}`}
      src={src}
      alt={alt}
      width={400}
      height={300}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
