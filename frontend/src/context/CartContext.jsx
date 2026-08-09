import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { resolveUrl } from '../services/api';
import { loadCartItems, saveCartItems } from '../services/cartStorage';
import {
  cartTotals,
  colorNameFor,
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  MAX_ITEM_QTY,
} from '../utils/cartConfig';

const CartContext = createContext(null);

const clampQty = (qty, stock) => {
  const desired = Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : 1;
  const cap = Math.max(1, Math.min(MAX_ITEM_QTY, Number(stock) || MAX_ITEM_QTY));
  return Math.min(cap, desired);
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCartItems);
  const [isOpen, setIsOpen] = useState(false);

  // Persist on every mutation so the cart survives refreshes and reopens.
  useEffect(() => {
    saveCartItems(items);
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);

  const addToCart = useCallback((product, options = {}) => {
    const productId = product?.id;
    const price = Number(product?.price);
    if (productId === undefined || !Number.isFinite(price) || price <= 0) return;

    const size = options.size ?? DEFAULT_SIZE;
    const color = options.color ?? DEFAULT_COLOR;
    const quantity = clampQty(options.quantity, product.stockQuantity);
    const id = `${productId}::${size}::${color}`;

    setItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id
            ? { ...item, quantity: clampQty(item.quantity + quantity, product.stockQuantity) }
            : item
        );
      }
      const line = {
        id,
        productId,
        name: product.name || 'Untitled',
        category: product.category || '',
        price,
        oldPrice: Number(product.oldPrice) || 0,
        size,
        color,
        colorName: options.colorName ?? colorNameFor(color),
        imageUrl: resolveUrl(product.imageUrl),
        stockQuantity: Number(product.stockQuantity) || 0,
        quantity,
      };
      return [...prev, line];
    });

    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const increaseQuantity = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: clampQty(item.quantity + 1, item.stockQuantity) } : item
      )
    );
  }, []);

  const decreaseQuantity = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totals = useMemo(() => cartTotals(items), [items]);

  const value = useMemo(
    () => ({
      items,
      count: totals.count,
      totals,
      isOpen,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    }),
    [items, totals, isOpen, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, openCart, closeCart, toggleCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}