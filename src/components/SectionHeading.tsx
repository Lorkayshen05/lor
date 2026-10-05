import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeading({ id, title, subtitle, action }: Props) {
  return (
    <div className="section-heading">
      <div>
        <h2 id={id} className="section-heading__title">
          {title}
        </h2>
        {subtitle && <p className="section-heading__sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
