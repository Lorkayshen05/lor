import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider, type AppProviderProps } from './state/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { ProductPage } from './pages/ProductPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Staff dashboard: its own chunk, so customers never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'));

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<p className="container page">Loading…</p>}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="menu/:id" element={<ProductPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="confirmation/:id" element={<ConfirmationPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** HashRouter keeps the app deployable on any static host (including GitHub Pages) without rewrite rules. */
export function App(props: Omit<AppProviderProps, 'children'>) {
  return (
    <ErrorBoundary>
      <AppProvider {...props}>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
