import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  
  // Keep a ref of cart items to avoid dependency cycle in useEffect
  const guestCartRef = useRef([]);

  // Load cart from DB when user logs in, or from localStorage when guest
  useEffect(() => {
    const loadCart = async () => {
      if (user && user.cart_id) {
        try {
          // If we had guest items, sync them to database first
          const guestItems = JSON.parse(localStorage.getItem('guest_cart') || '[]');
          if (guestItems.length > 0) {
            await api.syncCart(user.id, guestItems);
            localStorage.removeItem('guest_cart');
          }

          // Fetch items from DB
          const dbItems = await api.fetchCartItems(user.cart_id);
          // Map DB items to standard format (id, name, price, quantity, etc.)
          const mappedItems = dbItems.map(item => ({
            db_item_id: item.id, // Keep reference to cart_items.id for updates/deletes
            id: item.medicine.id,
            name: item.medicine.name,
            price: item.medicine.price,
            imageUrl: item.medicine.image_url || item.medicine.imageUrl,
            quantity: item.quantity,
          }));
          setCartItems(mappedItems);
        } catch (e) {
          console.error('Không thể tải giỏ hàng từ cơ sở dữ liệu', e);
        }
      } else {
        // Load guest cart
        const guestItems = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        setCartItems(guestItems);
      }
    };

    loadCart();
  }, [user]);

  // Keep track of guest cart items in localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('guest_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  const addToCart = useCallback(async (product) => {
    let showToastMessage = `Đã thêm ${product.name} vào giỏ hàng`;
    
    if (user && user.cart_id) {
      try {
        const existing = cartItems.find(item => item.id === product.id);
        const newQty = existing ? existing.quantity + 1 : 1;
        
        // Add or update item in DB
        await api.addCartItem(user.cart_id, product.id, newQty);
        
        // Re-fetch cart items to get updated state and database item IDs
        const dbItems = await api.fetchCartItems(user.cart_id);
        const mappedItems = dbItems.map(item => ({
          db_item_id: item.id,
          id: item.medicine.id,
          name: item.medicine.name,
          price: item.medicine.price,
          imageUrl: item.medicine.image_url || item.medicine.imageUrl,
          quantity: item.quantity,
        }));
        setCartItems(mappedItems);
      } catch (e) {
        console.error(e);
        showToastMessage = 'Có lỗi xảy ra khi thêm vào giỏ hàng';
      }
    } else {
      // Guest behavior
      setCartItems(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { ...product, quantity: 1 }];
      });
    }

    setToast({ visible: true, message: showToastMessage });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  }, [user, cartItems]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    
    if (user && user.cart_id) {
      try {
        const item = cartItems.find(x => x.id === productId);
        if (item && item.db_item_id) {
          await api.updateCartItem(item.db_item_id, quantity);
          setCartItems(prev => prev.map(x => x.id === productId ? { ...x, quantity } : x));
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setCartItems(prev => prev.map(x => x.id === productId ? { ...x, quantity } : x));
    }
  }, [user, cartItems]);

  const removeFromCart = useCallback(async (productId) => {
    if (user && user.cart_id) {
      try {
        const item = cartItems.find(x => x.id === productId);
        if (item && item.db_item_id) {
          await api.deleteCartItem(item.db_item_id);
          setCartItems(prev => prev.filter(x => x.id !== productId));
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setCartItems(prev => prev.filter(x => x.id !== productId));
    }
  }, [user, cartItems]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    if (!user) {
      localStorage.removeItem('guest_cart');
    }
  }, [user]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, updateQuantity, removeFromCart, clearCart, cartCount }}>
      {children}
      {toast.visible && (
        <div className="toast-notification fade-in">
          {toast.message}
        </div>
      )}
    </CartContext.Provider>
  );
};

