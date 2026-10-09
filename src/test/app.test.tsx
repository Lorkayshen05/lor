import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { initI18n, setLanguage } from '../i18n';
import type { SalesDataSource } from '../services/bestSellers';
import { makeOrder } from './fixtures';

beforeAll(async () => {
  await initI18n('en');
});
beforeEach(async () => {
  window.location.hash = '#/';
  await setLanguage('en');
  window.localStorage.clear();
});

const go = (hash: string) => {
  window.location.hash = hash;
};

async function chooseLanguage(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.click(screen.getByRole('button', { name: /^Language|^اللغة|^语言/ }));
  const dialog = await screen.findByRole('dialog');
  await user.type(within(dialog).getByRole('searchbox'), query);
  const row = within(dialog).getAllByRole('button').find((b) => b.classList.contains('lang-row'))!;
  await user.click(row);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('first visit', () => {
  it('shows FIRST TIME HERE with a combo from real prices, no best-seller claims, and a sample-data notice', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'First time here?' })).toBeInTheDocument();
    expect(screen.getByText('Not sure what to order? Start here.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Our signatures' })).toBeInTheDocument();
    expect(screen.queryByText(/best seller/i)).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/Sample menu/);
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
  });
});

describe('language switching never resets the order', () => {
  it('keeps cart, order type and table number across English → Arabic → Simplified Chinese', async () => {
    const user = userEvent.setup();
    go('#/menu');
    render(<App />);

    await user.click(screen.getByRole('radio', { name: /take away/i }));
    const card = screen.getByRole('heading', { name: 'Black Sesame Paste' }).closest('article')!;
    await user.click(within(card).getByRole('button', { name: /^Add: Black Sesame Paste/ }));
    expect(screen.getByRole('link', { name: /Cart: 1/ })).toBeInTheDocument();

    await chooseLanguage(user, 'Arab');
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByRole('link', { name: /السلة: 1/ })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').find((r) => r.getAttribute('aria-checked') === 'true')).toHaveTextContent('سفري');

    await chooseLanguage(user, 'Simplified');
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'));
    expect(screen.getByRole('link', { name: /购物车: 1/ })).toBeInTheDocument();
    // Price is still the takeaway price after two language changes.
    await user.click(screen.getByRole('link', { name: /购物车: 1/ }));
    expect(await screen.findByRole('heading', { name: '您的购物车' })).toBeInTheDocument();
    expect(screen.getAllByText('RM 8.00').length).toBeGreaterThan(0);
  });

  it('keeps wizard progress across a language change', async () => {
    const user = userEvent.setup();
    go('#/discover?mode=wizard');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Second time' }));
    await user.click(screen.getByRole('button', { name: 'sesame' }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    await chooseLanguage(user, 'Melayu');
    expect(screen.getByText('Langkah 3 daripada 3')).toBeInTheDocument();
  });
});

describe('order type pricing', () => {
  it('re-prices product cards, cart and totals when the order type changes', async () => {
    const user = userEvent.setup();
    go('#/menu/steamed-egg-custard');
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Add to cart/ }));
    expect(screen.getAllByText('RM 6.50').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('radio', { name: /take away/i }));
    expect(screen.getByRole('radio', { name: /take away/i })).toHaveAttribute('aria-checked', 'true');
    go('#/cart');
    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
    const totals = document.querySelector('.totals__grand')!;
    expect(totals).toHaveTextContent('RM 7.00');
  });
});

describe('checkout → welcome back → reorder', () => {
  it('validates, places the order, saves history, then offers ORDER AGAIN / TRY SOMETHING NEW', async () => {
    const user = userEvent.setup();
    go('#/menu/peanut-paste');
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Add to cart/ }));
    go('#/checkout');

    await user.click(await screen.findByRole('button', { name: /Place order/ }));
    expect(await screen.findByText(/Enter your table number/)).toBeInTheDocument();
    expect(screen.getByLabelText('Table number')).toHaveFocus();
    expect(screen.getByLabelText('Table number')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('Table number'), 'b7');
    await user.click(screen.getByRole('button', { name: /Place order/ }));

    expect(await screen.findByRole('heading', { name: 'Order received' })).toBeInTheDocument();
    expect(screen.getByText(/^RDH-\d{6}-/)).toBeInTheDocument();
    expect(screen.getByText('B7')).toBeInTheDocument();
    expect(screen.getByText('Received')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to menu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View order' })).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem('rdh.orders.v1')!);
    expect(saved).toHaveLength(1);
    expect(JSON.stringify(saved)).not.toMatch(/phone|"name":"(?!Peanut)/); // no personal data persisted
    expect(window.localStorage.getItem('rdh.session.v1')).toContain('"cart":[]');

    go('#/');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Ready to try something different?')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'First time here?' })).not.toBeInTheDocument();
    // "Try something new" never re-suggests what was just ordered.
    const tryNew = screen.getByRole('heading', { name: 'Try something new' }).closest('section')!;
    expect(within(tryNew).queryByText('Peanut Paste')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Order again' }));
    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Peanut Paste' })).toBeInTheDocument();
  });

  it('shows a readable error and keeps the cart if sending fails', async () => {
    const user = userEvent.setup();
    go('#/menu/soy-milk');
    render(<App gateway={{ submit: () => Promise.reject(new Error('offline')) }} />);
    await user.click(screen.getByRole('button', { name: /Add to cart/ }));
    go('#/checkout');
    await user.type(await screen.findByLabelText('Table number'), '3');
    await user.click(screen.getByRole('button', { name: /Place order/ }));
    expect(await screen.findByText("We couldn't send your order")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('rdh.session.v1')!).cart).toHaveLength(1);
  });
});

describe('menu search and filters', () => {
  it('finds by Chinese name and code, filters, and shows an empty state with a way out', async () => {
    const user = userEvent.setup();
    go('#/menu');
    render(<App />);
    const search = screen.getByRole('searchbox', { name: 'Search the menu' });
    await user.type(search, '花生');
    expect(screen.getByRole('heading', { name: 'Peanut Paste' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Black Sesame Paste' })).not.toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'F01');
    expect(screen.getByRole('heading', { name: 'Chinese Tea' })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'zzzz');
    expect(screen.getByText(/No dishes match “zzzz”/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search & filters' }));
    await user.click(screen.getByRole('button', { name: 'Drinks' }));
    expect(screen.getByRole('button', { name: 'Drinks' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('heading', { name: 'Peanut Paste' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Soy Milk' })).toBeInTheDocument();
  });
});

describe('best sellers are evidence-based', () => {
  const sales = (n: number): SalesDataSource => ({
    getOrders: async () => Array.from({ length: n }, () => makeOrder(['chinese-tea', 'chinese-tea', 'soy-milk'])),
  });

  it('switches to ranked "Best sellers" only once real order data is available', async () => {
    render(<App salesSource={sales(80)} />);
    expect(await screen.findByRole('heading', { name: 'Best sellers' })).toBeInTheDocument();
    expect(screen.getByText(/#1 Best seller/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Our signatures' })).not.toBeInTheDocument();
  });
  it('stays on "Our signatures" with too little data', async () => {
    render(<App salesSource={sales(3)} />);
    expect(await screen.findByRole('heading', { name: 'Our signatures' })).toBeInTheDocument();
    expect(screen.queryByText(/best seller/i)).not.toBeInTheDocument();
  });
});

describe('budget planner UI', () => {
  it('shows total and remaining that never exceed the chosen budget, and adds all to the cart', async () => {
    const user = userEvent.setup();
    go('#/discover?mode=plan');
    render(<App />);
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'RM30' }));
    const total = screen.getByText('Total', { selector: 'dt' }).nextElementSibling!.textContent!;
    const remaining = screen.getByText('Remaining budget').nextElementSibling!.textContent!;
    const n = (s: string) => Number(s.replace(/[^\d.]/g, ''));
    expect(n(total)).toBeLessThanOrEqual(30);
    expect(n(total) + n(remaining)).toBeCloseTo(30);
    const planner = screen.getByRole('region', { name: 'Build my order' });
    await user.click(within(planner).getByRole('button', { name: 'Add all to cart' }));
    expect(screen.getByRole('link', { name: /Cart: \d+/ })).toBeInTheDocument();
  });
});

describe('unknown routes and products', () => {
  it('shows friendly not-found states', async () => {
    go('#/menu/does-not-exist');
    const { unmount } = render(<App />);
    expect(await screen.findByText("We couldn't find that dish.")).toBeInTheDocument();
    unmount();
    go('#/nope');
    render(<App />);
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});

describe('production-readiness regressions', () => {
  it('clears the table number after an order so the next order cannot go to the wrong table', async () => {
    const user = userEvent.setup();
    go('#/menu/soy-milk');
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Add to cart/ }));
    go('#/checkout');
    await user.type(await screen.findByLabelText('Table number'), '9');
    await user.click(screen.getByRole('button', { name: /Place order/ }));
    await screen.findByRole('heading', { name: 'Order received' });
    expect(JSON.parse(window.localStorage.getItem('rdh.session.v1')!).tableNumber).toBe('');
  });

  it('ORDER AGAIN merges into the cart instead of discarding what is already there', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('rdh.orders.v1', JSON.stringify([makeOrder(['peanut-paste'])]));
    window.localStorage.setItem('rdh.session.v1', JSON.stringify({ orderType: 'dine-in', tableNumber: '', cart: [{ itemId: 'soy-milk', quantity: 1 }], wizard: { step: 0 }, planner: {} }));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Order again' }));
    expect(await screen.findByRole('link', { name: 'Peanut Paste' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Soy Milk' })).toBeInTheDocument();
  });

  it('"Add all" cannot silently double-add: it becomes a link to the cart once added', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add all to cart' }));
    expect(screen.queryByRole('button', { name: 'Add all to cart' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Added · View cart/ }).length).toBeGreaterThan(0);
    const cart = JSON.parse(window.localStorage.getItem('rdh.session.v1')!).cart as { quantity: number }[];
    expect(cart.every((c) => c.quantity === 1)).toBe(true);
  });

  it('cart badge counts only items that are actually in the total', () => {
    window.localStorage.setItem('rdh.session.v1', JSON.stringify({ orderType: 'dine-in', tableNumber: '', cart: [{ itemId: 'soy-milk', quantity: 2 }, { itemId: 'ghost-item', quantity: 5 }], wizard: { step: 0 }, planner: {} }));
    render(<App />);
    expect(screen.getByRole('link', { name: 'Cart: 2' })).toBeInTheDocument();
  });

  it('blocks checkout from the cart while unavailable items remain, and lets you remove them', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('rdh.session.v1', JSON.stringify({ orderType: 'dine-in', tableNumber: '', cart: [{ itemId: 'soy-milk', quantity: 1 }, { itemId: 'ghost-item', quantity: 1 }], wizard: { step: 0 }, planner: {} }));
    go('#/cart');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer available');
    expect(screen.getByRole('button', { name: /^Checkout/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remove unavailable items' }));
    expect(screen.getByRole('link', { name: /^Checkout/ })).toBeInTheDocument();
  });

  it('drops stale validation errors when the order type changes on checkout', async () => {
    const user = userEvent.setup();
    go('#/menu/soy-milk');
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Add to cart/ }));
    go('#/checkout');
    await user.click(await screen.findByRole('button', { name: /Place order/ }));
    expect(await screen.findByText(/Enter your table number/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /take away/i }));
    expect(screen.queryByText('Please fix the highlighted fields.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Enter your table number/)).not.toBeInTheDocument();
  });

  it('tags only a few "Try something new" picks for returning customers, not most of the menu', () => {
    window.localStorage.setItem('rdh.orders.v1', JSON.stringify([makeOrder(['black-sesame-paste'])]));
    go('#/menu');
    render(<App />);
    const tags = screen.getAllByText('Try something new', { selector: '.tag' });
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.length).toBeLessThanOrEqual(3);
  });

  it('marks the applicable price in text and labels Chinese text with its language', () => {
    go('#/menu/peanut-paste');
    render(<App />);
    expect(screen.getByText('(Selected)')).toBeInTheDocument();
    expect(document.querySelector('.product__zh')).toHaveAttribute('lang', 'zh-Hans');
  });
});
