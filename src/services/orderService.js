import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { whatsappService } from './whatsappService';

const ORDERS_KEY = 'cardapio_orders_history';

export const orderService = {
  async createOrder({
    restaurant,
    user,
    customerName,
    customerPhone,
    deliveryAddress,
    items,
    subtotal,
    deliveryFee,
    totalAmount,
    paymentMethod,
    notes,
  }) {
    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const orderId = `order-${Date.now()}`;

    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      restaurant_id: restaurant?.id || 'res-default-001',
      user_id: user?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: deliveryAddress,
      status: 'pending',
      subtotal: Number(subtotal),
      delivery_fee: Number(deliveryFee),
      total_amount: Number(totalAmount),
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'online' ? 'paid' : 'pending',
      notes: notes || '',
      items: items.map((i) => ({
        dish_id: i.dish.id,
        dish_name: i.dish.name,
        unit_price: Number(i.dish.promotional_price || i.dish.price),
        quantity: i.quantity,
        subtotal: Number(i.quantity * (i.dish.promotional_price || i.dish.price)),
        notes: i.notes || '',
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Tentar persistir no Supabase se disponível
    if (isSupabaseConfigured) {
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([{
            restaurant_id: newOrder.restaurant_id,
            user_id: newOrder.user_id,
            customer_name: newOrder.customer_name,
            customer_phone: newOrder.customer_phone,
            delivery_address: newOrder.delivery_address,
            status: newOrder.status,
            subtotal: newOrder.subtotal,
            delivery_fee: newOrder.delivery_fee,
            total_amount: newOrder.total_amount,
            payment_method: newOrder.payment_method,
            payment_status: newOrder.payment_status,
            notes: newOrder.notes,
          }])
          .select()
          .single();

        if (!orderError && orderData) {
          newOrder.id = orderData.id;
          newOrder.order_number = orderData.order_number || orderNumber;

          // Inserir itens
          const orderItemsPayload = newOrder.items.map((it) => ({
            order_id: orderData.id,
            dish_id: it.dish_id?.startsWith('dish-') ? null : it.dish_id,
            dish_name: it.dish_name,
            unit_price: it.unit_price,
            quantity: it.quantity,
            subtotal: it.subtotal,
            notes: it.notes,
          }));

          await supabase.from('order_items').insert(orderItemsPayload);
        }
      } catch (err) {
        console.warn('Erro ao salvar pedido no Supabase, salvando localmente:', err);
      }
    }

    // Salvar localmente no histórico
    const existingOrders = this.getLocalOrders();
    existingOrders.unshift(newOrder);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(existingOrders));

    // Notificar exclusivamente o WhatsApp do restaurante (caso configurado pelo admin)
    whatsappService.notifyAdminNewOrder(newOrder, restaurant);

    return newOrder;
  },

  async getCustomerOrders(userId, userPhone = null) {
    if (isSupabaseConfigured && userId) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((o) => ({
            ...o,
            items: o.order_items || [],
          }));
        }
      } catch (e) {
        console.warn('Erro ao buscar pedidos do cliente no Supabase:', e);
      }
    }

    // Fallback local
    const local = this.getLocalOrders();
    return local.filter((o) => (userId && o.user_id === userId) || (userPhone && o.customer_phone === userPhone));
  },

  async getAllOrders() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((o) => ({
            ...o,
            items: o.order_items || [],
          }));
        }
      } catch (e) {
        console.warn('Erro ao buscar todos os pedidos do Supabase:', e);
      }
    }

    return this.getLocalOrders();
  },

  async updateOrderStatus(orderId, newStatus, restaurant = null) {
    let orders = this.getLocalOrders();
    let targetOrder = null;

    orders = orders.map((o) => {
      if (o.id === orderId) {
        targetOrder = { ...o, status: newStatus, updated_at: new Date().toISOString() };
        return targetOrder;
      }
      return o;
    });

    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .select()
          .single();

        if (!error && data) {
          targetOrder = { ...targetOrder, ...data };
        }
      } catch (e) {
        console.warn('Erro ao atualizar status no Supabase:', e);
      }
    }

    // Status atualizado com sucesso (propagado em tempo real via Supabase Realtime para a tela do cliente)
    return targetOrder;
  },

  getLocalOrders() {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  },
};
