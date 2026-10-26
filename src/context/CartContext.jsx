import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'cardapio_cart_items';

export function CartProvider({ children, deliveryFee = 0 }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (dish, quantity = 1, notes = '') => {
    setItems((prev) => {
      // Se já existir com a mesma observação, incrementa
      const existingIndex = prev.findIndex(
        (i) => i.dish.id === dish.id && (i.notes || '') === (notes || '')
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      return [...prev, { dish, quantity, notes }];
    });
    setIsDrawerOpen(true);
  };

  const updateQuantity = (index, delta) => {
    setItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const totalCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotal = items.reduce((acc, curr) => {
    const price = Number(curr.dish.promotional_price || curr.dish.price);
    return acc + price * curr.quantity;
  }, 0);

  const total = subtotal + Number(deliveryFee || 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        isDrawerOpen,
        setIsDrawerOpen,
        totalCount,
        subtotal,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser utilizado dentro de um CartProvider');
  }
  return context;
}
