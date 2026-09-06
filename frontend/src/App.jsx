import AppRouter from './router/AppRouter';
import CartDrawer from './components/cart/CartDrawer/CartDrawer';
import ScrollToTop from './components/utils/ScrollToTop';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AppRouter />
      <CartDrawer />
    </>
  );
}