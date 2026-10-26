import React, { useState } from 'react';
import { whatsappService } from '../../services/whatsappService';

export function WhatsAppNotificationModal({
  isOpen,
  onClose,
  order,
  newStatus,
  restaurant,
}) {
  const [copied, setCopied] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [sendingViaGateway, setSendingViaGateway] = useState(false);
  const [gatewayResult, setGatewayResult] = useState(null);

  if (!isOpen || !order) return null;

  const currentStatus = newStatus || order.status;
  const rawMessage = whatsappService.buildCustomerNotificationText(
    order,
    restaurant?.name,
    currentStatus
  );

  const finalMessage = customNotes
    ? `${rawMessage}\n\n⚠️ *Mensagem do Restaurante:* ${customNotes}`
    : rawMessage;

  const waLink = whatsappService.getWhatsAppLink(order.customer_phone, finalMessage);

  const handleCopy = async () => {
    const ok = await whatsappService.copyToClipboard(finalMessage);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSendDirectGateway = async () => {
    if (!restaurant?.whatsapp_api_url || !restaurant?.whatsapp_api_token) {
      alert('Nenhum gateway de WhatsApp configurado nas opções da loja.');
      return;
    }

    setSendingViaGateway(true);
    setGatewayResult(null);

    const res = await whatsappService.sendDirectViaGateway(
      restaurant.whatsapp_api_url,
      restaurant.whatsapp_api_token,
      order.customer_phone,
      finalMessage
    );

    setSendingViaGateway(false);
    setGatewayResult(res);
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 1080 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="modal-header border-bottom py-3 px-4 bg-light">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{ width: '38px', height: '38px', backgroundColor: '#25D366' }}
              >
                <i className="bi bi-whatsapp fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0">Disparo de Notificação WhatsApp</h5>
                <small className="text-muted">
                  Pedido #{order.order_number || order.id?.substring(0, 5)} • {order.customer_name}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Fechar"
            ></button>
          </div>

          <div className="modal-body p-4">
            {/* Destinatário e Status */}
            <div className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded-3 border bg-white mb-3 gap-2">
              <div>
                <small className="text-muted d-block">Destinatário do Cliente:</small>
                <span className="fw-bold">{order.customer_name}</span>
                <span className="text-success ms-2 fw-semibold">
                  <i className="bi bi-whatsapp me-1"></i>
                  {order.customer_phone}
                </span>
              </div>

              <div>
                <small className="text-muted d-block">Novo Status Notificado:</small>
                <span className="badge bg-primary px-3 py-2 rounded-pill">
                  {whatsappService.getStatusLabel(currentStatus)}
                </span>
              </div>
            </div>

            {/* Pré-visualização da Mensagem */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label small fw-bold text-muted mb-0">
                  <i className="bi bi-chat-text-fill text-success me-1"></i> Conteúdo Formatado da Mensagem:
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0 small"
                  onClick={handleCopy}
                >
                  <i className={`bi ${copied ? 'bi-check-all text-success' : 'bi-clipboard'} me-1`}></i>
                  {copied ? 'Copiado para a área de transferência!' : 'Copiar Texto'}
                </button>
              </div>

              <div
                className="p-3 rounded-3 border font-monospace small"
                style={{
                  backgroundColor: '#f8fafc',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.45',
                }}
              >
                {finalMessage}
              </div>
            </div>

            {/* Mensagem customizada adicional opcional */}
            <div className="mb-3">
              <label htmlFor="customNoteInput" className="form-label small fw-semibold text-muted">
                Adicionar aviso personalizado a esta mensagem (opcional):
              </label>
              <input
                id="customNoteInput"
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder="Ex: O entregador está com colete azul / Por favor aguarde na portaria..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
              />
            </div>

            {/* Feedback de Gateway se existir */}
            {gatewayResult && (
              <div
                className={`alert ${
                  gatewayResult.success ? 'alert-success' : 'alert-danger'
                } py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2`}
              >
                <i className={`bi ${gatewayResult.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
                <span>
                  {gatewayResult.success
                    ? 'Mensagem despachada automaticamente via API do Gateway com sucesso!'
                    : `Falha no envio via gateway: ${gatewayResult.error || 'Erro desconhecido'}`}
                </span>
              </div>
            )}
          </div>

          {/* Rodapé com botões de disparo */}
          <div className="modal-footer border-top py-3 px-4 bg-light d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Fechar
            </button>

            <div className="d-flex align-items-center gap-2">
              {/* Botão de Gateway (se configurado) */}
              {restaurant?.whatsapp_api_url && (
                <button
                  type="button"
                  className="btn btn-outline-primary fw-semibold d-flex align-items-center gap-1"
                  onClick={handleSendDirectGateway}
                  disabled={sendingViaGateway}
                >
                  {sendingViaGateway ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : (
                    <i className="bi bi-send-fill"></i>
                  )}
                  <span>Disparar via API</span>
                </button>
              )}

              {/* Botão Oficial WhatsApp Web / App (Disparo 100% livre de bloqueio) */}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
                onClick={() => {
                  setTimeout(() => onClose(), 800);
                }}
              >
                <i className="bi bi-whatsapp fs-5"></i>
                <span>Enviar pelo WhatsApp Agora</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
