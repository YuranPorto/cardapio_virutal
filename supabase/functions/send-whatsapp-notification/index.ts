// ==============================================================================
// SUPABASE EDGE FUNCTION: send-whatsapp-notification
// ==============================================================================
// Esta função processa notificações para o cliente e para o admin do restaurante
// quando um pedido é criado ou atualizado.
// Pode se integrar a gateways como Evolution API, Z-API, Baileys ou Twilio.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  order_id: string;
  recipient_type: "customer" | "admin" | "both";
  custom_message?: string;
  new_status?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: NotificationPayload = await req.json();
    const { order_id, recipient_type = "both", new_status } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar dados do pedido, restaurante e itens
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado", details: orderError }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar restaurante
    const { data: restaurant } = await supabaseClient
      .from("restaurants")
      .select("*")
      .eq("id", order.restaurant_id)
      .single();

    const restaurantName = restaurant?.name || "Cardápio Virtual";
    const adminWhatsApp = restaurant?.admin_notification_whatsapp || restaurant?.phone_whatsapp || "";

    // Formatar itens do pedido
    const itemsList = (order.order_items || [])
      .map((item: any) => `• ${item.quantity}x ${item.dish_name} (R$ ${Number(item.subtotal).toFixed(2).replace('.', ',')})`)
      .join("\n");

    const statusLabels: Record<string, string> = {
      pending: "Recebido (Aguardando confirmação)",
      confirmed: "Confirmado pelo restaurante",
      preparing: "Em preparo na cozinha",
      out_for_delivery: "Saiu para entrega",
      delivered: "Entregue com sucesso",
      cancelled: "Cancelado",
    };

    const statusText = statusLabels[new_status || order.status] || order.status;

    // Mensagem para o cliente
    const customerMessage = `Olá, *${order.customer_name}*!\n\n` +
      `Seu pedido *#${order.order_number}* no *${restaurantName}* foi atualizado:\n` +
      `Status: *${statusText}*\n\n` +
      `*Itens:* \n${itemsList}\n\n` +
      `Total: *R$ ${Number(order.total_amount).toFixed(2).replace('.', ',')}*\n` +
      `Endereço de Entrega: ${order.delivery_address?.street}, ${order.delivery_address?.number} - ${order.delivery_address?.neighborhood}\n\n` +
      `Agradecemos a sua preferência!`;

    // Mensagem para o admin
    const adminMessage = `🔔 *NOVA ATUALIZAÇÃO DE PEDIDO!*\n\n` +
      `Pedido: *#${order.order_number}*\n` +
      `Cliente: *${order.customer_name}* (${order.customer_phone})\n` +
      `Status Atual: *${statusText}*\n\n` +
      `*Itens do Pedido:*\n${itemsList}\n\n` +
      `Total: *R$ ${Number(order.total_amount).toFixed(2).replace('.', ',')}*\n` +
      `Forma: ${order.payment_method}\n` +
      `Endereço: ${order.delivery_address?.street}, ${order.delivery_address?.number} (${order.delivery_address?.neighborhood})\n` +
      (order.notes ? `Obs: ${order.notes}\n` : "");

    // Exemplo de integração externa com gateway (se configurado no Supabase Secrets)
    const gatewayUrl = Deno.env.get("WHATSAPP_GATEWAY_URL");
    const gatewayToken = Deno.env.get("WHATSAPP_GATEWAY_TOKEN");

    let dispatchedCount = 0;

    if (gatewayUrl && gatewayToken) {
      // Disparo automático via gateway caso configurado
      if (recipient_type === "customer" || recipient_type === "both") {
        await fetch(`${gatewayUrl}/send-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${gatewayToken}` },
          body: JSON.stringify({ phone: order.customer_phone, message: customerMessage }),
        }).catch(err => console.error("Falha ao enviar para cliente:", err));
        dispatchedCount++;
      }

      if ((recipient_type === "admin" || recipient_type === "both") && adminWhatsApp) {
        await fetch(`${gatewayUrl}/send-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${gatewayToken}` },
          body: JSON.stringify({ phone: adminWhatsApp, message: adminMessage }),
        }).catch(err => console.error("Falha ao enviar para admin:", err));
        dispatchedCount++;
      }
    }

    // Retorna payloads formatados para uso direto via wa.me se necessário
    return new Response(
      JSON.stringify({
        success: true,
        dispatched_count: dispatchedCount,
        has_gateway: Boolean(gatewayUrl && gatewayToken),
        customer_phone: order.customer_phone,
        customer_message: customerMessage,
        admin_phone: adminWhatsApp,
        admin_message: adminMessage,
        customer_wa_link: `https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(customerMessage)}`,
        admin_wa_link: adminWhatsApp ? `https://wa.me/${adminWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(adminMessage)}` : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
