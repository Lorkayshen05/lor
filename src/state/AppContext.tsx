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
import {
  buildOrder,
  createLocalGateway,
  localOrderRepository,
  type OrderContact,
  type OrderGateway,
  type OrderRepository,
} from '../services/orderHistory';
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
  salesSource?: SalesDataSource;
  initialSession?: Partial<SessionState>;
}

export function AppProvider({
  children,
  menu = MENU,
  repository = localOrderRepository,
  gateway,
  salesSource = localSalesDataSource,
  initialSession,
}: AppProviderProps) {
  const gatewayRef = useRef<OrderGateway>(gateway ?? createLocalGateway());
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    () => ({ ...loadSession(), ...initialSession }),
  );
  const [orders, setOrders] = useState<Order[]>(() => repository.list());
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const menuById = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);
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
      const order = buildOrder(
        {
          cart: session.cart,
          orderType: session.orderType,
          tableNumber: session.tableNumber,
          pickupInMinutes: options?.pickupInMinutes,
        },
        menuById,
        repository.getCustomerId(),
      );
      const accepted = await gatewayRef.current.submit(order, contact);
      repository.add(accepted);
      setOrders(repository.list());
      dispatch({ type: 'cart', action: { type: 'clear' } });
      // A table number belongs to one visit; keeping it could send the next order to the wrong table.
      dispatch({ type: 'table', value: '' });
      return accepted;
    },
    [session.cart, session.orderType, session.tableNumber, menuById, repository],
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
      visitType: getVisitType(orders),
      seenIds,
      tryNewIds,
      bestSellers,
      placeOrder,
      reorder,
      announce,
      announcement,
    }),
    [menu, menuById, session, totals, cartActions, orders, seenIds, tryNewIds, bestSellers, placeOrder, reorder, announce, announcement],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
