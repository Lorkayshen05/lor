import { Component, type ReactNode } from 'react';
import i18n from '../i18n';

interface State {
  failed: boolean;
}

/** Last-resort screen: the cart is persisted, so a reload is safe. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled UI error', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container page">
        <div className="empty" role="alert">
          <h1 className="empty__title">{i18n.t('errors.generic')}</h1>
          <p className="muted">{i18n.t('errors.genericHint')}</p>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            {i18n.t('errors.reload')}
          </button>
        </div>
      </div>
    );
  }
}
