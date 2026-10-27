import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { whatsappService } from '../services/whatsappService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export function OrderTrackingModal({ isOpen, onClose, restaurant }) {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    loadOrders();

    // Supabase Realtime: sincronização instantânea quando o restaurante atualiza o status
    let channel = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel(`tracking-orders-live-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            if (payload.new) {
              const updatedRow = payload.new;
              setOrders((prev) => {
                const index = prev.findIndex((o) => o.id === updatedRow.id);
                if (index !== -1) {
                  const updatedList = [...prev];
                  updatedList[index] = { ...updatedList[index], ...updatedRow };
                  return updatedList;
                }
                return prev;
              });

              setSelectedOrder((prevSelected) => {
                if (prevSelected && prevSelected.id === updatedRow.id) {
                  return { ...prevSelected, ...updatedRow };
                }
                return prevSelected;
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsLiveConnected(true);
          }
        });
    }

    // Intervalo de segurança suave a cada 15s como fallback
    const interval = setInterval(loadOrders, 15000);

    return () => {
      clearInterval(interval);
      if (channel && isSupabaseConfigured) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen, user?.id, profile?.phone]);

  const loadOrders = async () => {
    setLoading(true);
    const list = await orderService.getCustomerOrders(user?.id, profile?.phone);
    setOrders(list);
    if (list.length > 0 && !selectedOrder) {
      setSelectedOrder(list[0]);
    } else if (selectedOrder) {
      const refreshed = list.find((o) => o.id === selectedOrder.id);
      if (refreshed) setSelectedOrder(refreshed);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const steps = [
    { key: 'pending', label: 'Recebido', icon: 'bi-receipt' },
    { key: 'confirmed', label: 'Confirmado', icon: 'bi-check2-circle' },
    { key: 'preparing', label: 'Na Cozinha', icon: 'bi-fire' },
    { key: 'out_for_delivery', label: 'A Caminho', icon: 'bi-bicycle' },
    { key: 'delivered', label: 'Entregue', icon: 'bi-house-check-fill' },
  ];

  const getStepStatus = (stepKey, currentStatus) => {
    const orderIndex = steps.findIndex((s) => s.key === currentStatus);
    const thisIndex = steps.findIndex((s) => s.key === stepKey);

    if (currentStatus === 'cancelled') return 'cancelled';
    if (thisIndex < orderIndex) return 'completed';
    if (thisIndex === orderIndex) return 'active';
    return 'pending';
  };

  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 1060 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          <div className="modal-header border-bottom py-3 px-4">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-clock-history text-primary fs-5"></i>
                <h5 className="modal-title fw-bold mb-0">Acompanhar Meus Pedidos</h5>
              </div>
              <span className={`badge rounded-pill px-2 py-1 small d-none d-sm-inline-flex align-items-center gap-1 ${isLiveConnected ? 'bg-success bg-opacity-10 text-success border border-success-subtle' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                <span className={`spinner-grow spinner-grow-sm ${isLiveConnected ? 'text-success' : 'text-secondary'}`} style={{ width: '7px', height: '7px' }}></span>
                <span style={{ fontSize: '0.72rem' }}>{isLiveConnected ? 'Ao Vivo (Realtime)' : 'Conectando ao vivo...'}</span>
              </span>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Fechar"
            ></button>
          </div>

          <div className="modal-body p-4">
            {orders.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                <h6 className="mt-3 fw-bold">Nenhum pedido encontrado</h6>
                <p className="text-muted small">
                  Você ainda não possui pedidos recentes vinculados a este dispositivo ou conta.
                </p>
              </div>
            ) : (
              <div className="row g-4">
                {/* Lista lateral de pedidos */}
                <div className="col-12 col-md-5 border-end-md">
                  <small className="text-muted fw-bold d-block mb-2">Seus Pedidos Recentes</small>
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {orders.map((ord) => {
                      const isSelected = selectedOrder?.id === ord.id;
                      return (
                        <div
                          key={ord.id}
                          className={`p-3 rounded-3 border cursor-pointer transition ${
                            isSelected ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedOrder(ord)}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small">Pedido #{ord.order_number || ord.id.substring(0, 5)}</span>
                            <span className="badge bg-dark rounded-pill" style={{ fontSize: '0.7rem' }}>
                              {whatsappService.getStatusLabel(ord.status).split(' ')[1] || ord.status}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-muted small">
                            <span>{new Date(ord.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="fw-bold text-success">{formatCurrency(ord.total_amount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detalhes do Pedido Selecionado e Stepper */}
                <div className="col-12 col-md-7">
                  {selectedOrder ? (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold mb-0">
                          Status do Pedido #{selectedOrder.order_number || selectedOrder.id.substring(0, 5)}
                        </h6>
                        <span className="small text-muted">
                          {new Date(selectedOrder.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {/* Stepper Visual */}
                      {selectedOrder.status === 'cancelled' ? (
                        <div className="alert alert-danger py-2 px-3 small rounded-3 mb-4 d-flex align-items-center gap-2">
                          <i className="bi bi-x-octagon-fill fs-5"></i>
                          <span>Este pedido foi <strong>Cancelado</strong>. Entre em contato com o restaurante para mais detalhes.</span>
                        </div>
                      ) : (
                        <div className="mb-4 ps-2">
                          {steps.map((st) => {
                            const state = getStepStatus(st.key, selectedOrder.status);
                            return (
                              <div
                                key={st.key}
                                className={`order-step ${state}`}
                              >
                                <div className="step-icon">
                                  <i className={`bi ${st.icon}`}></i>
                                </div>
                                <div>
                                  <div className="fw-bold small">{st.label}</div>
                                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    {state === 'completed' && 'Etapa concluída'}
                                    {state === 'active' && 'Status atual em andamento'}
                                    {state === 'pending' && 'Aguardando próxima etapa'}
                                  </small>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Itens do Pedido */}
                      <div className="bg-light p-3 rounded-3 mb-3 small">
                        <span className="fw-bold d-block mb-1">Itens do Pedido:</span>
                        <ul className="mb-2 ps-3">
                          {(selectedOrder.items || selectedOrder.order_items || []).map((it, idx) => (
                            <li key={idx}>
                              {it.quantity}x {it.dish_name || it.name} ({formatCurrency(it.subtotal || (it.unit_price * it.quantity))})
                              {it.notes && <div className="text-muted fst-italic">Obs: {it.notes}</div>}
                            </li>
                          ))}
                        </ul>
                        <div className="d-flex justify-content-between border-top pt-2 fw-bold">
                          <span>Total:</span>
                          <span className="text-success">{formatCurrency(selectedOrder.total_amount)}</span>
                        </div>
                      </div>

                      {/* Botão de Contato WhatsApp com o Restaurante */}
                      <button
                        type="button"
                        className="btn btn-outline-success w-100 py-2 small fw-bold d-flex align-items-center justify-content-center gap-2"
                        onClick={() => {
                          const msg = `Olá, gostaria de informações sobre meu pedido #${selectedOrder.order_number || selectedOrder.id.substring(0, 5)}`;
                          whatsappService.openWhatsApp(restaurant?.phone_whatsapp, msg);
                        }}
                      >
                        <i className="bi bi-whatsapp"></i>
                        <span>Falar com o Restaurante sobre este Pedido</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted small text-center py-5">
                      Selecione um pedido ao lado para visualizar os detalhes.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
