import type { ElementType } from 'react';
import type { MenuItem } from '../types';
import { useMenuText } from '../hooks/useMenuText';

/** Second name line (Chinese for most readers, English for Chinese readers) with the right `lang` for screen readers. */
export function SecondaryName({ item, as: Tag = 'p', className }: { item: MenuItem; as?: ElementType; className?: string }) {
  const { secondaryOf } = useMenuText();
  const { text, lang } = secondaryOf(item);
  return (
    <Tag className={className} lang={lang}>
      {text}
    </Tag>
  );
}
