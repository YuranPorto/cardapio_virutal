import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const EVOLUTION_CONFIG = {
  url: 'https://evolution-api-latest-ypge.onrender.com',
  token: 'cardapio_evolution_secret_2026',
  instance: 'cardapio_demo',
};

export const whatsappService = {
  formatPhoneNumber(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    // Se não tiver código de país DDI (ex: 55 para Brasil), adiciona 55
    if (clean.length === 10 || clean.length === 11) {
      return `55${clean}`;
    }
    return clean;
  },

  formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  },

  getStatusLabel(status) {
    const map = {
      pending: '🟡 Pedido Recebido (Aguardando Confirmação)',
      confirmed: '🔵 Pedido Confirmado pelo Restaurante',
      preparing: '👨‍🍳 Em Preparo na Cozinha',
      out_for_delivery: '🛵 Saiu para Entrega',
      delivered: '✅ Entregue com Sucesso',
      cancelled: '❌ Pedido Cancelado',
    };
    return map[status] || status;
  },

  buildCustomerNotificationText(order, restaurantName, status = null) {
    const currentStatus = status || order.status;
    const itemsFormatted = (order.items || order.order_items || [])
      .map((item) => `• ${item.quantity}x ${item.dish_name || item.name} (${this.formatCurrency(item.subtotal || (item.unit_price * item.quantity))})${item.notes ? `\n   Obs: _${item.notes}_` : ''}`)
      .join('\n');

    const address = order.delivery_address || {};
    const addressStr = `${address.street || ''}, ${address.number || ''} ${address.complement ? `(${address.complement})` : ''} - ${address.neighborhood || ''}, ${address.city || ''}`;

    return `🧪 *[AMBIENTE DE TESTES / DEMONSTRAÇÃO]*\n\n` +
      `Olá, *${order.customer_name}*!\n` +
      `Seu pedido *#${order.order_number || order.id?.substring(0, 5) || '1'}* no *${restaurantName}* foi atualizado!\n\n` +
      `*Status Atual:* ${this.getStatusLabel(currentStatus)}\n\n` +
      `*Itens:* \n${itemsFormatted}\n\n` +
      `*Taxa de Entrega:* ${this.formatCurrency(order.delivery_fee)}\n` +
      `*Valor Total:* *${this.formatCurrency(order.total_amount)}*\n\n` +
      `*Endereço de Entrega:* \n📍 ${addressStr}\n\n` +
      `⚠️ _Aviso: Este é um projeto de demonstração e portfólio. Não há cobrança financeira real e nenhum produto físico será entregue._`;
  },

  buildAdminNotificationText(order, restaurantName) {
    const itemsFormatted = (order.items || order.order_items || [])
      .map((item) => `• ${item.quantity}x ${item.dish_name || item.name} (${this.formatCurrency(item.subtotal || (item.unit_price * item.quantity))})${item.notes ? `\n   Obs: _${item.notes}_` : ''}`)
      .join('\n');

    const address = order.delivery_address || {};
    const addressStr = `${address.street || ''}, ${address.number || ''} ${address.complement ? `(${address.complement})` : ''} - ${address.neighborhood || ''}, ${address.city || ''}`;

    const paymentMap = {
      pix: 'PIX (Chave enviada)',
      cash_on_delivery: 'Dinheiro na Entrega',
      card_on_delivery: 'Cartão na Entrega (Maquininha)',
      online: 'Pagamento Online',
      order_only: 'Apenas Encomenda',
    };

    return `🧪 *[DEMO ADMIN] NOVO PEDIDO RECEBIDO!* [${restaurantName}]\n\n` +
      `*Pedido:* #${order.order_number || order.id?.substring(0, 5) || '1'}\n` +
      `*Cliente:* ${order.customer_name}\n` +
      `*WhatsApp do Cliente:* ${order.customer_phone}\n\n` +
      `*Itens Solicitados:*\n${itemsFormatted}\n\n` +
      `*Subtotal:* ${this.formatCurrency(order.subtotal)}\n` +
      `*Taxa de Entrega:* ${this.formatCurrency(order.delivery_fee)}\n` +
      `*Total a Receber:* *${this.formatCurrency(order.total_amount)}*\n` +
      `*Forma de Pagamento:* ${paymentMap[order.payment_method] || order.payment_method}\n\n` +
      `*Local de Entrega:*\n📍 ${addressStr}\n` +
      (order.notes ? `\n📝 *Observações:* ${order.notes}\n` : '') +
      `\n⚠️ _Ambiente de Demonstração - Transação simulada._\n` +
      `Responder cliente: https://wa.me/${this.formatPhoneNumber(order.customer_phone)}`;
  },

  buildTestNotificationText(restaurantName, status = 'preparing') {
    return `🧪 *TESTE DE INTEGRAÇÃO WHATSAPP* [${restaurantName}]\n\n` +
      `Esta é uma mensagem de teste para validação do sistema de notificações.\n` +
      `*Status Simulado:* ${this.getStatusLabel(status)}\n` +
      `*Horário do Envio:* ${new Date().toLocaleTimeString('pt-BR')}\n\n` +
      `Se você recebeu esta mensagem, as notificações do cardápio virtual estão funcionando com 100% de precisão! ✅`;
  },

  getWhatsAppLink(phone, message) {
    const formattedPhone = this.formatPhoneNumber(phone);
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encoded}`;
  },

  openWhatsApp(phone, message) {
    const url = this.getWhatsAppLink(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      console.warn('Clipboard API não disponível:', e);
    }
    // Fallback com textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch {
      textArea.remove();
      return false;
    }
  },

  async triggerEdgeFunctionNotification(orderId, recipientType = 'both', newStatus = null) {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          order_id: orderId,
          recipient_type: recipientType,
          new_status: newStatus,
        },
      });

      if (!error && data?.success) {
        return data;
      }
    } catch (err) {
      console.warn('Edge function WhatsApp indisponível no momento:', err);
    }
    return null;
  },

  async sendDirectViaGateway(gatewayUrl, gatewayToken, phone, message, instanceName = 'cardapio_demo') {
    const activeUrl = (gatewayUrl || EVOLUTION_CONFIG.url).replace(/\/+$/, '');
    const activeToken = gatewayToken || EVOLUTION_CONFIG.token;
    const activeInstance = instanceName || EVOLUTION_CONFIG.instance;
    const formattedPhone = this.formatPhoneNumber(phone);

    if (!formattedPhone) return { success: false, error: 'Telefone inválido' };

    // Tentativa 1: Evolution API v2 (/message/sendText/{instance})
    try {
      const evolutionRes = await fetch(`${activeUrl}/message/sendText/${activeInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: activeToken,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      });

      if (evolutionRes.ok) {
        const data = await evolutionRes.json();
        console.log(`[WhatsApp] Mensagem enviada com sucesso para ${formattedPhone}:`, data);
        return { success: true, data };
      } else {
        const errText = await evolutionRes.text();
        console.warn(`[WhatsApp] Erro Evolution API (${evolutionRes.status}):`, errText);
      }
    } catch (e) {
      console.warn('Falha Evolution API sendText, tentando fallback:', e);
    }

    // Tentativa 2: Fallback genérico (/send-text)
    try {
      const res = await fetch(`${activeUrl}/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
          apikey: activeToken,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      const json = await res.json();
      return { success: res.ok, data: json };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async notifyOrderCreated(order, restaurant) {
    const restaurantName = restaurant?.name || 'Cardápio Gourmet';
    const gatewayUrl = restaurant?.whatsapp_api_url || EVOLUTION_CONFIG.url;
    const gatewayToken = restaurant?.whatsapp_api_token || EVOLUTION_CONFIG.token;
    const instanceName = restaurant?.whatsapp_instance_name || EVOLUTION_CONFIG.instance;

    // 1. Mensagem para o cliente
    if (order?.customer_phone) {
      const customerMsg = this.buildCustomerNotificationText(order, restaurantName, 'pending');
      await this.sendDirectViaGateway(gatewayUrl, gatewayToken, order.customer_phone, customerMsg, instanceName);
    }

    // 2. Mensagem para o admin do restaurante
    const adminPhone = restaurant?.admin_notification_whatsapp || restaurant?.phone_whatsapp || '5512982096857';
    if (adminPhone) {
      const adminMsg = this.buildAdminNotificationText(order, restaurantName);
      await this.sendDirectViaGateway(gatewayUrl, gatewayToken, adminPhone, adminMsg, instanceName);
    }

    // 3. Notificar via Edge Function como redundância
    if (order?.id) {
      this.triggerEdgeFunctionNotification(order.id, 'both');
    }
  },

  async notifyOrderStatusUpdate(order, newStatus, restaurant) {
    const restaurantName = typeof restaurant === 'object' && restaurant?.name ? restaurant.name : (restaurant || 'Cardápio Gourmet');
    const gatewayUrl = (typeof restaurant === 'object' && restaurant?.whatsapp_api_url) || EVOLUTION_CONFIG.url;
    const gatewayToken = (typeof restaurant === 'object' && restaurant?.whatsapp_api_token) || EVOLUTION_CONFIG.token;
    const instanceName = (typeof restaurant === 'object' && restaurant?.whatsapp_instance_name) || EVOLUTION_CONFIG.instance;

    // Mensagem para o cliente informando a atualização de status
    if (order?.customer_phone) {
      const customerMsg = this.buildCustomerNotificationText(order, restaurantName, newStatus);
      await this.sendDirectViaGateway(gatewayUrl, gatewayToken, order.customer_phone, customerMsg, instanceName);
    }

    if (order?.id) {
      this.triggerEdgeFunctionNotification(order.id, 'customer', newStatus);
    }
  },

  async fetchInstanceQrCode(gatewayUrl, gatewayToken, instanceName = 'cardapio_demo') {
    const activeUrl = (gatewayUrl || EVOLUTION_CONFIG.url).replace(/\/+$/, '');
    const activeToken = gatewayToken || EVOLUTION_CONFIG.token;
    const activeInstance = instanceName || EVOLUTION_CONFIG.instance;

    try {
      const res = await fetch(`${activeUrl}/instance/connect/${activeInstance}`, {
        method: 'GET',
        headers: { apikey: activeToken },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Erro ao obter QR code da Evolution API:', err);
      return null;
    }
  },
};

