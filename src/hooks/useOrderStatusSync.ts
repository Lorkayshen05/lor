import { useEffect } from 'react';
import type { Order } from '../types';
import { useApp } from '../state/AppContext';

const POLL_MS = 8000;
const FINAL: Order['status'][] = ['completed', 'cancelled'];

/**
 * Keeps this device's copy of an order in step with what the restaurant has done to it (confirmed, preparing, ready…).
 * The server is the only source of status; nothing on the device can change it. No-op without a server or a tracking token.
 */
export function useOrderStatusSync(order: Order | undefined): void {
  const { api, updateOrderStatus } = useApp();
  const id = order?.orderId;
  const token = order?.trackingToken;
  const done = !order || FINAL.includes(order.status);

  useEffect(() => {
    if (!api || !id || !token || done) return;
    let stopped = false;
    const check = async () => {
      try {
        const latest = await api.orderStatus(id, token);
        if (!stopped && latest) updateOrderStatus(id, latest.status);
      } catch {
        /* offline or server busy: keep what we have and try again on the next tick */
      }
    };
    void check();
    const timer = setInterval(() => void check(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [api, id, token, done, updateOrderStatus]);
}
