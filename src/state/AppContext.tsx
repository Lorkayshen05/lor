import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, FlavourTag, MenuItem, Money, Order, OrderType, VisitType } from '../types';
import { MENU } from '../data/menu';
import { cartReducer, orderToCart, sanitizeCart, type CartAction } from '../services/cart';
import { getRecommendations } from '../services/recommendations';
import { priceCart, type CartTotals } from '../services/pricing';
import { localOrderRepository, type OrderRepository } from '../services/orderHistory';
import { createHttpGateway, createLocalGateway, PriceChangedError, type OrderContact, type OrderGateway } from '../services/orderGateway';
import { defaultApi, type ApiClient } from '../services/api';
import { clearKey, fingerprintOf, keyFor } from '../services/idempotency';
import i18n from '../i18n';
import { getVisitType, orderedItemIds } from '../services/visit';
import {
  computeBestSellers,
  localSalesDataSource,
  type BestSeller,
  type SalesDataSource,
} from '../services/bestSellers';
import { safeStorage } from '../utils/storage';

const SESSION_KEY = 'rdh.session.v1';

export interface WizardState {
  step: 0 | 1 | 2 | 3;
  visit?: VisitType;
  craving?: FlavourTag;
  budget?: Money;
}

export interface PlannerState {
  people?: number;
  budget?: Money;
}

interface SessionState {
  orderType: OrderType;
  tableNumber: string;
  cart: CartItem[];
  wizard: WizardState;
  planner: PlannerState;
}

const DEFAULT_SESSION: SessionState = {
  orderType: 'dine-in',
  tableNumber: '',
  cart: [],
  wizard: { step: 0 },
  planner: {},
};

function loadSession(): SessionState {
  const raw = safeStorage.get<Partial<SessionState>>(SESSION_KEY, {});
  return {
    orderType: raw.orderType === 'takeaway' ? 'takeaway' : 'dine-in',
    tableNumber: typeof raw.tableNumber === 'string' ? raw.tableNumber.slice(0, 6) : '',
    cart: sanitizeCart(raw.cart),
    wizard: raw.wizard && typeof raw.wizard.step === 'number' ? raw.wizard : DEFAULT_SESSION.wizard,
    planner: raw.planner && typeof raw.planner === 'object' ? raw.planner : DEFAULT_SESSION.planner,
  };
}

type SessionAction =
  | { type: 'orderType'; value: OrderType }
  | { type: 'table'; value: string }
  | { type: 'wizard'; value: WizardState }
  | { type: 'planner'; value: PlannerState }
  | { type: 'cart'; action: CartAction };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'orderType':
      return { ...state, orderType: action.value };
    case 'table':
      return { ...state, tableNumber: action.value };
    case 'wizard':
      return { ...state, wizard: action.value };
    case 'planner':
      return { ...state, planner: action.value };
    case 'cart':
      return { ...state, cart: cartReducer(state.cart, action.action) };
  }
}

export interface AppContextValue {
  menu: readonly MenuItem[];
  menuById: ReadonlyMap<string, MenuItem>;
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  tableNumber: string;
  setTableNumber: (v: string) => void;
  cart: CartItem[];
  totals: CartTotals;
  itemCount: number;
  cartActions: {
    add: (itemId: string, quantity?: number) => void;
    addMany: (items: CartItem[]) => void;
    increment: (itemId: string) => void;
    decrement: (itemId: string) => void;
    setQuantity: (itemId: string, quantity: number) => void;
    remove: (itemId: string) => void;
    clear: () => void;
  };
  wizard: WizardState;
  setWizard: (w: WizardState) => void;
  planner: PlannerState;
  setPlanner: (p: PlannerState) => void;
  orders: Order[];
  /** Server connection, or null in local prototype mode. */
  api: ApiClient | null;
  /** Re-read prices and availability from the server (no-op in local mode). */
  refreshMenu: () => Promise<void>;
  /** Apply a status change reported by the server to this device's order history. */
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  visitType: VisitType;
  /** Products this customer has already ordered (from real history). */
  seenIds: ReadonlySet<string>;
  /** Products worth tagging "Try something new" (top rule-based picks the customer hasn't ordered). */
  tryNewIds: ReadonlySet<string>;
  /** Real ranking, or null until enough real orders exist (UI then shows "Our signatures"). */
  bestSellers: BestSeller[] | null;
  placeOrder: (contact: OrderContact, options?: { pickupInMinutes?: number }) => Promise<Order>;
  reorder: (order: Order) => { skippedNames: string[] };
  /** Short, polite screen-reader + visual confirmation (e.g. "Added"). */
  announce: (message: string) => void;
  announcement: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export interface AppProviderProps {
  children: ReactNode;
  menu?: readonly MenuItem[];
  repository?: OrderRepository;
  gateway?: OrderGateway;
  /** Server API; defaults to the one configured at build time (VITE_ORDER_API). Pass null to force local mode. */
  api?: ApiClient | null;
  salesSource?: SalesDataSource;
  initialSession?: Partial<SessionState>;
}

export function AppProvider({
  children,
  menu: initialMenu = MENU,
  repository = localOrderRepository,
  gateway,
  api = defaultApi,
  salesSource = localSalesDataSource,
  initialSession,
}: AppProviderProps) {
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    () => ({ ...loadSession(), ...initialSession }),
  );
  const [orders, setOrders] = useState<Order[]>(() => repository.list());
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // With a server, prices and availability come from it (it is the authority); the bundled menu is only the first paint
  // and the fallback if the server can't be reached.
  const [menu, setMenu] = useState<readonly MenuItem[]>(initialMenu);
  const menuById = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);
  const gatewayRef = useRef<OrderGateway>(gateway ?? (api ? createHttpGateway(api) : createLocalGateway(menuById)));
  if (!gateway && !api) gatewayRef.current = createLocalGateway(menuById); // local mode prices from the current menu

  const refreshMenu = useCallback(async () => {
    if (!api) return;
    try {
      setMenu((await api.menu()).menu);
    } catch {
      /* keep the last known menu; checkout is still validated by the server */
    }
  }, [api]);

  useEffect(() => {
    void refreshMenu();
  }, [refreshMenu]);

  const [bestSellers, setBestSellers] = useState<BestSeller[] | null>(null);
  const seenIds = useMemo(() => orderedItemIds(orders), [orders]);

  const tryNewIds = useMemo(
    () =>
      orders.length === 0
        ? new Set<string>()
        : new Set(
            getRecommendations({
              menu,
              customerHistory: orders,
              visitType: 'returning',
              orderType: session.orderType,
              excludeOrdered: true,
              limit: 3,
            }).map((r) => r.item.id),
          ),
    [menu, orders, session.orderType],
  );

  useEffect(() => {
    let cancelled = false;
    salesSource
      .getOrders()
      .then((all) => !cancelled && setBestSellers(computeBestSellers(all, menu)))
      .catch(() => !cancelled && setBestSellers(null));
    return () => {
      cancelled = true;
    };
  }, [salesSource, menu]);

  useEffect(() => {
    safeStorage.set(SESSION_KEY, session);
  }, [session]);

  useEffect(() => () => clearTimeout(announceTimer.current), []);

  const announce = useCallback((message: string) => {
    clearTimeout(announceTimer.current);
    setAnnouncement(message);
    announceTimer.current = setTimeout(() => setAnnouncement(''), 2600);
  }, []);

  const totals = useMemo(
    () => priceCart(session.cart, menuById, session.orderType),
    [session.cart, session.orderType, menuById],
  );

  const cartActions = useMemo<AppContextValue['cartActions']>(() => {
    const send = (action: CartAction) => dispatch({ type: 'cart', action });
    return {
      add: (itemId, quantity = 1) => send({ type: 'add', itemId, quantity }),
      addMany: (items) => send({ type: 'addMany', items }),
      increment: (itemId) => send({ type: 'increment', itemId }),
      decrement: (itemId) => send({ type: 'decrement', itemId }),
      setQuantity: (itemId, quantity) => send({ type: 'setQuantity', itemId, quantity }),
      remove: (itemId) => send({ type: 'remove', itemId }),
      clear: () => send({ type: 'clear' }),
    };
  }, []);

  const placeOrder = useCallback(
    async (contact: OrderContact, options?: { pickupInMinutes?: number }): Promise<Order> => {
      const submissionCore = {
        items: session.cart,
        orderType: session.orderType,
        tableNumber: session.tableNumber,
        pickupInMinutes: options?.pickupInMinutes,
      };
      // Same order + same key on every retry: a lost response can never turn into a second order.
      const idempotencyKey = keyFor(fingerprintOf({ ...submissionCore, name: contact.name, phone: contact.phone }));
      let accepted: Order;
      try {
        accepted = await gatewayRef.current.submit({
          ...submissionCore,
          contact,
          expectedTotal: totals.total,
          customerId: repository.getCustomerId(),
          language: i18n.language,
          idempotencyKey,
        });
      } catch (e) {
        if (e instanceof PriceChangedError) await refreshMenu(); // show the customer the new prices before they re-confirm
        throw e;
      }
      clearKey();
      repository.add(accepted);
      setOrders(repository.list());
      dispatch({ type: 'cart', action: { type: 'clear' } });
      // A table number belongs to one visit; keeping it could send the next order to the wrong table.
      dispatch({ type: 'table', value: '' });
      return accepted;
    },
    [session.cart, session.orderType, session.tableNumber, totals.total, repository, refreshMenu],
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: Order['status']) => {
      const current = repository.get(orderId);
      if (!current || current.status === status) return;
      repository.add({ ...current, status });
      setOrders(repository.list());
    },
    [repository],
  );

  const reorder = useCallback(
    (order: Order) => {
      const { items, skippedNames } = orderToCart(order, menuById);
      // Merge rather than replace: never silently discard what the customer already chose.
      dispatch({ type: 'cart', action: { type: 'addMany', items } });
      return { skippedNames };
    },
    [menuById],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      menu,
      menuById,
      orderType: session.orderType,
      setOrderType: (t) => dispatch({ type: 'orderType', value: t }),
      tableNumber: session.tableNumber,
      setTableNumber: (v) => dispatch({ type: 'table', value: v }),
      cart: session.cart,
      totals,
      itemCount: totals.count,
      cartActions,
      wizard: session.wizard,
      setWizard: (w) => dispatch({ type: 'wizard', value: w }),
      planner: session.planner,
      setPlanner: (p) => dispatch({ type: 'planner', value: p }),
      orders,
      api,
      refreshMenu,
      updateOrderStatus,
      visitType: getVisitType(orders),
      seenIds,
      tryNewIds,
      bestSellers,
      placeOrder,
      reorder,
      announce,
      announcement,
    }),
    [menu, menuById, session, totals, cartActions, orders, api, refreshMenu, updateOrderStatus, seenIds, tryNewIds, bestSellers, placeOrder, reorder, announce, announcement],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
