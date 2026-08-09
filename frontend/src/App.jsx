import AppRouter from './router/AppRouter';
import CartDrawer from './components/cart/CartDrawer/CartDrawer';

export default function App() {
  return (
    <>
      <AppRouter />
      <CartDrawer />
    </>
  );
}