# Documentação das Edge Functions e Endpoints do Supabase

## 1. Edge Function: `send-whatsapp-notification`
Responsável por processar e despachar notificações de pedidos para o cliente e para o WhatsApp do restaurante.

### Endpoint
`POST https://<project-ref>.supabase.co/functions/v1/send-whatsapp-notification`

### Headers
```http
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY ou USER_JWT>
```

### Body (JSON)
```json
{
  "order_id": "00000000-0000-0000-0000-000000000000",
  "recipient_type": "both", // "customer" | "admin" | "both"
  "new_status": "preparing" // opcional
}
```

### Resposta de Sucesso (HTTP 200)
```json
{
  "success": true,
  "dispatched_count": 2,
  "has_gateway": true,
  "customer_phone": "+5511988887777",
  "customer_message": "Olá, João! Seu pedido #1002 no Cardápio Gourmet foi atualizado...",
  "admin_phone": "+5511999999999",
  "admin_message": "🔔 NOVA ATUALIZAÇÃO DE PEDIDO!...",
  "customer_wa_link": "https://wa.me/5511988887777?text=...",
  "admin_wa_link": "https://wa.me/5511999999999?text=..."
}
```

---

## 2. Edge Function: `order-status-update`
Permite a atualização atômica do status de um pedido na fila de produção, garantindo checagem estrita da role `admin` do solicitante.

### Endpoint
`POST https://<project-ref>.supabase.co/functions/v1/order-status-update`

### Headers
```http
Content-Type: application/json
Authorization: Bearer <USER_JWT_ADMIN>
```

### Body (JSON)
```json
{
  "order_id": "00000000-0000-0000-0000-000000000000",
  "new_status": "out_for_delivery"
}
```

### Resposta (HTTP 200)
```json
{
  "success": true,
  "order": {
    "id": "00000000-0000-0000-0000-000000000000",
    "status": "out_for_delivery",
    "updated_at": "2026-10-26T19:00:00Z"
  },
  "message": "Status atualizado para out_for_delivery"
}
```

---

## 3. Estados da Fila de Pedidos
| Status | Rótulo Amigável | Descrição | Notificação Cliente |
| :--- | :--- | :--- | :--- |
| `pending` | Pendente | Pedido recebido no sistema | Confirmando recepção |
| `confirmed` | Confirmado | Restaurante aceitou o pedido | Pedido confirmado |
| `preparing` | Em Preparo | Pratos em produção na cozinha | Em preparo |
| `out_for_delivery` | Saiu p/ Entrega | Pedido a caminho do endereço | Saiu para entrega |
| `delivered` | Entregue | Pedido finalizado com sucesso | Concluído / Agradecimento |
| `cancelled` | Cancelado | Pedido cancelado | Aviso de cancelamento |
