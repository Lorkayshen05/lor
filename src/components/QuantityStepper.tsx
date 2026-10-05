import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

interface Props {
  quantity: number;
  name: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function QuantityStepper({ quantity, name, onIncrement, onDecrement }: Props) {
  const { t } = useTranslation();
  return (
    <div className="stepper" role="group" aria-label={`${t('common.quantity')}: ${name}`}>
      <button type="button" className="stepper__btn" onClick={onDecrement} aria-label={t('common.decrease', { name })}>
        <Icon name="minus" size={18} />
      </button>
      <output className="stepper__value" aria-live="polite">
        {quantity}
      </output>
      <button type="button" className="stepper__btn" onClick={onIncrement} aria-label={t('common.increase', { name })}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
