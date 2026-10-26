import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { addressService } from '../services/addressService';
import { orderService } from '../services/orderService';
import { whatsappService } from '../services/whatsappService';

export function CheckoutModal({
  isOpen,
  onClose,
  restaurant,
  onOrderSuccess,
  onOpenAuth,
}) {
  const { user, profile, updatePhone } = useAuth();
  const { items, subtotal, total, clearCart } = useCart();

  // Endereços
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // Form novo endereço
  const [newTitle, setNewTitle] = useState('Casa');
  const [newStreet, setNewStreet] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newComplement, setNewComplement] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newCity, setNewCity] = useState('São Paulo');
  const [newState, setNewState] = useState('SP');
  const [newZip, setNewZip] = useState('');

  // Dados do Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Forma de Pagamento e Observações
  const isOrdersOnlyMode = restaurant?.mode === 'orders_only';
  const [paymentMethod, setPaymentMethod] = useState(
    isOrdersOnlyMode ? 'order_only' : 'pix'
  );
  const [notes, setNotes] = useState('');

  // Estado de Finalização
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Carregar dados iniciais ao abrir
  useEffect(() => {
    if (!isOpen) return;

    if (profile) {
      setCustomerName(profile.full_name || '');
      setCustomerPhone(profile.phone || '');
    }

    if (user?.id) {
      loadUserAddresses(user.id);
    } else {
      setAddresses([]);
      setShowNewAddressForm(true);
    }
  }, [isOpen, user, profile]);

  const loadUserAddresses = async (userId) => {
    const list = await addressService.getAddresses(userId);
    setAddresses(list);
    if (list.length > 0) {
      const defaultAddr = list.find((a) => a.is_default) || list[0];
      setSelectedAddressId(defaultAddr.id);
      setShowNewAddressForm(false);
    } else {
      setShowNewAddressForm(true);
    }
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    if (val.length > 6) {
      val = `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7)}`;
    } else if (val.length > 2) {
      val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
    }
    setCustomerPhone(val);
  };

  const handleSaveNewAddress = async () => {
    if (!newStreet || !newNumber || !newNeighborhood) {
      setErrorMsg('Preencha os campos obrigatórios do endereço (Rua, Número e Bairro).');
      return null;
    }

    const payload = {
      title: newTitle,
      street: newStreet,
      number: newNumber,
      complement: newComplement,
      neighborhood: newNeighborhood,
      city: newCity,
      state: newState,
      zip_code: newZip,
      is_default: addresses.length === 0,
    };

    if (user?.id) {
      const saved = await addressService.addAddress(user.id, payload);
      await loadUserAddresses(user.id);
      if (saved) {
        setSelectedAddressId(saved.id);
        setShowNewAddressForm(false);
        return saved;
      }
    }

    // Se for visitante sem cadastro
    const tempAddr = { ...payload, id: `temp-${Date.now()}` };
    setAddresses([tempAddr]);
    setSelectedAddressId(tempAddr.id);
    setShowNewAddressForm(false);
    return tempAddr;
  };

  const handleFinishOrder = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validações
    if (!customerName.trim()) {
      setErrorMsg('Informe seu nome completo para identificação do pedido.');
      return;
    }

    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Informe um número de WhatsApp válido com DDD (obrigatório para notificações).');
      return;
    }

    // Atualiza o perfil caso tenha mudado
    if (user && profile && (!profile.phone || profile.phone !== customerPhone)) {
      updatePhone(customerPhone).catch(() => {});
    }

    // Obter endereço selecionado
    let targetAddress = addresses.find((a) => a.id === selectedAddressId);
    if (showNewAddressForm || !targetAddress) {
      targetAddress = await handleSaveNewAddress();
      if (!targetAddress) return;
    }

    setLoading(true);

    try {
      const order = await orderService.createOrder({
        restaurant,
        user,
        customerName,
        customerPhone,
        deliveryAddress: targetAddress,
        items,
        subtotal,
        deliveryFee: restaurant?.delivery_fee || 0,
        totalAmount: total,
        paymentMethod: isOrdersOnlyMode ? 'order_only' : paymentMethod,
        notes,
      });

      setCreatedOrder(order);
      clearCart();
      onOrderSuccess?.(order);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao processar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 1055 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          {/* Cabeçalho */}
          <div className="modal-header border-bottom py-3 px-4">
            <h5 className="modal-title fw-bold">
              {createdOrder ? '🎉 Pedido Realizado com Sucesso!' : 'Finalizar Pedido & Entrega'}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Fechar"
            ></button>
          </div>

          <div className="modal-body p-4">
            {errorMsg && (
              <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-circle-fill"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* CASO: PEDIDO FINALIZADO COM SUCESSO */}
            {createdOrder ? (
              <div className="text-center py-3">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center text-white mb-3 shadow"
                  style={{ width: '70px', height: '70px', backgroundColor: '#10b981' }}
                >
                  <i className="bi bi-check-lg fs-1"></i>
                </div>
                <h4 className="fw-bold mb-1">Pedido #{createdOrder.order_number} Confirmado!</h4>
                <p className="text-muted small mb-4">
                  Seu pedido já foi enviado para a cozinha do <strong>{restaurant?.name}</strong>.
                </p>

                {/* Box de Confirmação WhatsApp */}
                <div className="p-3 bg-light rounded-4 border text-start mb-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-whatsapp text-success fs-5"></i>
                    <span className="fw-bold small">Notificações WhatsApp Enviadas:</span>
                  </div>
                  <ul className="small text-muted mb-3 ps-3">
                    <li>
                      <strong>Para Você ({createdOrder.customer_phone}):</strong> Atualizações a cada mudança de status (preparo, rota de entrega e conclusão).
                    </li>
                    <li>
                      <strong>Para o Restaurante:</strong> Detalhes completos do pedido e endereço de entrega despachados.
                    </li>
                  </ul>

                  <div className="d-flex flex-column flex-sm-row gap-2">
                    <button
                      type="button"
                      className="btn btn-success flex-grow-1 fw-bold d-flex align-items-center justify-content-center gap-2"
                      onClick={() => {
                        const msg = whatsappService.buildAdminNotificationText(createdOrder, restaurant?.name);
                        whatsappService.openWhatsApp(restaurant?.phone_whatsapp || createdOrder.customer_phone, msg);
                      }}
                    >
                      <i className="bi bi-whatsapp"></i>
                      <span>Falar com o Restaurante</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-dark"
                      onClick={() => {
                        onClose();
                      }}
                    >
                      Acompanhar Pedido
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* FORMULÁRIO DE CHECKOUT */
              <form onSubmit={handleFinishOrder}>
                {/* 1. Identificação do Cliente */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">
                      <i className="bi bi-person-badge text-primary me-2"></i>1. Seus Dados de Contato
                    </h6>
                    {!user && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none p-0 small"
                        onClick={() => onOpenAuth?.()}
                      >
                        Já possui conta? Faça login
                      </button>
                    )}
                  </div>

                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="chkCustomerName" className="form-label small text-muted">Nome Completo *</label>
                      <input
                        id="chkCustomerName"
                        type="text"
                        className="form-control rounded-3"
                        placeholder="Ex: Maria Oliveira"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label htmlFor="chkCustomerPhone" className="form-label small text-muted">
                        <i className="bi bi-whatsapp text-success me-1"></i> WhatsApp para Notificações *
                      </label>
                      <input
                        id="chkCustomerPhone"
                        type="tel"
                        className="form-control rounded-3"
                        placeholder="(11) 99999-9999"
                        value={customerPhone}
                        onChange={handlePhoneChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Seleção de Múltiplos Endereços */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">
                      <i className="bi bi-geo-alt-fill text-danger me-2"></i>2. Endereço de Entrega
                    </h6>
                    {addresses.length > 0 && !showNewAddressForm && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm rounded-pill py-0 px-2 small"
                        onClick={() => setShowNewAddressForm(true)}
                      >
                        <i className="bi bi-plus-lg me-1"></i> Outro endereço
                      </button>
                    )}
                  </div>

                  {/* Lista de Endereços já cadastrados */}
                  {addresses.length > 0 && !showNewAddressForm ? (
                    <div className="d-flex flex-column gap-2 mb-2">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`p-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer ${
                            selectedAddressId === addr.id
                              ? 'border-primary bg-primary bg-opacity-10'
                              : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="radio"
                              name="addressRadio"
                              className="form-check-input mt-0"
                              checked={selectedAddressId === addr.id}
                              onChange={() => setSelectedAddressId(addr.id)}
                            />
                            <div>
                              <div className="fw-bold small">
                                {addr.title || 'Endereço'} {addr.is_default && <span className="badge bg-secondary ms-1">Padrão</span>}
                              </div>
                              <small className="text-muted d-block">
                                {addr.street}, {addr.number} {addr.complement ? `(${addr.complement})` : ''} - {addr.neighborhood}, {addr.city}
                              </small>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    /* Formulário para Novo Endereço */
                    <div className="p-3 rounded-3 border bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="fw-bold">Cadastrar Novo Endereço</small>
                        {addresses.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-decoration-none p-0 small"
                            onClick={() => setShowNewAddressForm(false)}
                          >
                            Voltar para meus endereços
                          </button>
                        )}
                      </div>

                      <div className="row g-2">
                        <div className="col-12 col-sm-4">
                          <label htmlFor="chkAddrTitle" className="form-label small text-muted">Identificação</label>
                          <select
                            id="chkAddrTitle"
                            className="form-select rounded-3 small"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                          >
                            <option value="Casa">Casa</option>
                            <option value="Trabalho">Trabalho</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        <div className="col-12 col-sm-8">
                          <label htmlFor="chkAddrStreet" className="form-label small text-muted">Rua / Avenida *</label>
                          <input
                            id="chkAddrStreet"
                            type="text"
                            className="form-control rounded-3"
                            placeholder="Nome da rua"
                            value={newStreet}
                            onChange={(e) => setNewStreet(e.target.value)}
                            required
                          />
                        </div>

                        <div className="col-6 col-sm-3">
                          <label htmlFor="chkAddrNumber" className="form-label small text-muted">Número *</label>
                          <input
                            id="chkAddrNumber"
                            type="text"
                            className="form-control rounded-3"
                            placeholder="123"
                            value={newNumber}
                            onChange={(e) => setNewNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-6 col-sm-4">
                          <label htmlFor="chkAddrComplement" className="form-label small text-muted">Complemento</label>
                          <input
                            id="chkAddrComplement"
                            type="text"
                            className="form-control rounded-3"
                            placeholder="Apto 42, Bloco B"
                            value={newComplement}
                            onChange={(e) => setNewComplement(e.target.value)}
                          />
                        </div>
                        <div className="col-12 col-sm-5">
                          <label htmlFor="chkAddrNeighborhood" className="form-label small text-muted">Bairro *</label>
                          <input
                            id="chkAddrNeighborhood"
                            type="text"
                            className="form-control rounded-3"
                            placeholder="Bairro"
                            value={newNeighborhood}
                            onChange={(e) => setNewNeighborhood(e.target.value)}
                            required
                          />
                        </div>

                        <div className="col-8 col-sm-8">
                          <label htmlFor="chkAddrCity" className="form-label small text-muted">Cidade</label>
                          <input
                            id="chkAddrCity"
                            type="text"
                            className="form-control rounded-3"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                          />
                        </div>
                        <div className="col-4 col-sm-4">
                          <label htmlFor="chkAddrState" className="form-label small text-muted">UF</label>
                          <input
                            id="chkAddrState"
                            type="text"
                            className="form-control rounded-3"
                            value={newState}
                            onChange={(e) => setNewState(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Forma de Pagamento ou Modo Encomenda */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-2">
                    <i className="bi bi-wallet2 text-success me-2"></i>3. Pagamento & Finalização
                  </h6>

                  {isOrdersOnlyMode ? (
                    <div className="alert alert-info py-2 px-3 small rounded-3 mb-3">
                      <i className="bi bi-info-circle-fill me-2"></i>
                      Este estabelecimento opera em modo <strong>Somente Encomendas</strong>. Seu pedido será enviado para o WhatsApp do restaurante e o acerto será combinado diretamente.
                    </div>
                  ) : (
                    <div className="row g-2 mb-3">
                      <div className="col-12 col-sm-4">
                        <label
                          className={`p-3 rounded-3 border d-flex align-items-center gap-2 w-100 ${
                            paymentMethod === 'pix' ? 'border-success bg-success bg-opacity-10' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type="radio"
                            name="paymentOpt"
                            checked={paymentMethod === 'pix'}
                            onChange={() => setPaymentMethod('pix')}
                          />
                          <div>
                            <div className="fw-bold small">PIX</div>
                            <small className="text-muted">Chave na entrega</small>
                          </div>
                        </label>
                      </div>

                      <div className="col-12 col-sm-4">
                        <label
                          className={`p-3 rounded-3 border d-flex align-items-center gap-2 w-100 ${
                            paymentMethod === 'card_on_delivery' ? 'border-primary bg-primary bg-opacity-10' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type="radio"
                            name="paymentOpt"
                            checked={paymentMethod === 'card_on_delivery'}
                            onChange={() => setPaymentMethod('card_on_delivery')}
                          />
                          <div>
                            <div className="fw-bold small">Cartão</div>
                            <small className="text-muted">Levar maquininha</small>
                          </div>
                        </label>
                      </div>

                      <div className="col-12 col-sm-4">
                        <label
                          className={`p-3 rounded-3 border d-flex align-items-center gap-2 w-100 ${
                            paymentMethod === 'cash_on_delivery' ? 'border-warning bg-warning bg-opacity-10' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type="radio"
                            name="paymentOpt"
                            checked={paymentMethod === 'cash_on_delivery'}
                            onChange={() => setPaymentMethod('cash_on_delivery')}
                          />
                          <div>
                            <div className="fw-bold small">Dinheiro</div>
                            <small className="text-muted">Na entrega</small>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Observações Gerais do Pedido */}
                  <div>
                    <label htmlFor="chkOrderNotes" className="form-label small text-muted">Observações do Pedido (Opcional):</label>
                    <textarea
                      id="chkOrderNotes"
                      className="form-control rounded-3"
                      rows="2"
                      placeholder="Ex: Tocar o interfone 22, troco para R$ 50, deixar na portaria..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* Resumo de Valores e Botão Confirmar */}
                <div className="pt-3 border-top d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
                  <div>
                    <small className="text-muted d-block">Total a Pagar:</small>
                    <span className="fs-4 fw-bold text-success">{formatCurrency(total)}</span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-brand btn-lg px-4 py-2 fw-bold d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      <i className="bi bi-check-circle-fill"></i>
                    )}
                    <span>Confirmar e Enviar Pedido</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
