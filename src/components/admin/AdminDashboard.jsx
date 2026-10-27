import React, { useState, useEffect } from 'react';
import { catalogService } from '../../services/catalogService';
import { restaurantService } from '../../services/restaurantService';
import { orderService } from '../../services/orderService';
import { whatsappService } from '../../services/whatsappService';
import { WhatsAppNotificationModal } from './WhatsAppNotificationModal';

export function AdminDashboard({ restaurant, onRestaurantUpdate, onExitAdmin }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'catalog' | 'settings'

  // ===================== ESTADOS: FILA DE PEDIDOS =====================
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ===================== ESTADOS: CARDÁPIO (CATEGORIAS E PRATOS) =====================
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');

  // Modal Categoria
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', description: '', sort_order: 1 });

  // Modal Prato
  const [showDishModal, setShowDishModal] = useState(false);
  const [dishForm, setDishForm] = useState({
    id: null,
    name: '',
    category_id: '',
    description: '',
    price: '',
    promotional_price: '',
    image_url: '',
    active: true,
  });
  const [dishImageFile, setDishImageFile] = useState(null);
  const [dishUploadLoading, setDishUploadLoading] = useState(false);

  // ===================== ESTADOS: CONFIGURAÇÕES DA LOJA =====================
  const [settingsForm, setSettingsForm] = useState({ ...(restaurant || {}) });
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ===================== ESTADOS: NOTIFICAÇÃO E TESTE WHATSAPP =====================
  const [whatsAppModalOrder, setWhatsAppModalOrder] = useState(null);
  const [whatsAppModalStatus, setWhatsAppModalStatus] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrFeedback, setQrFeedback] = useState('');

  // Testador de WhatsApp
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState(restaurant?.phone_whatsapp || '5511999998888');
  const [testWhatsAppStatus, setTestWhatsAppStatus] = useState('preparing');
  const [testMessageFeedback, setTestMessageFeedback] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    loadAllAdminData();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAllAdminData = async () => {
    await Promise.all([loadOrders(), loadCatalog()]);
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    const data = await orderService.getAllOrders();
    setOrders(data);
    setLoadingOrders(false);
  };

  const loadCatalog = async () => {
    const cats = await catalogService.getCategories();
    const dshs = await catalogService.getDishes();
    setCategories(cats);
    setDishes(dshs);
    if (cats.length > 0 && !dishForm.category_id) {
      setDishForm((prev) => ({ ...prev, category_id: cats[0].id }));
    }
  };

  // ===================== AÇÕES DE PEDIDOS / FILA =====================
  const handleUpdateStatus = async (order, newStatus) => {
    // 1. Atualiza no banco/serviço (dispara notificação automática instantânea via WhatsApp)
    const updated = await orderService.updateOrderStatus(order.id, newStatus, restaurant);
    await loadOrders();

    // 2. Abre o modal oficial de notificação WhatsApp garantindo disparo 100% confiável
    setWhatsAppModalOrder(updated || { ...order, status: newStatus });
    setWhatsAppModalStatus(newStatus);
    setIsWhatsAppModalOpen(true);
  };

  const handleNotifyCustomer = (order) => {
    setWhatsAppModalOrder(order);
    setWhatsAppModalStatus(order.status);
    setIsWhatsAppModalOpen(true);
  };

  // Teste de disparo de WhatsApp
  const handleRunWhatsAppTest = async () => {
    if (!testWhatsAppPhone || testWhatsAppPhone.replace(/\D/g, '').length < 10) {
      alert('Informe um número de telefone com DDD válido para o teste.');
      return;
    }
    const testMsg = whatsappService.buildTestNotificationText(restaurant?.name, testWhatsAppStatus);
    setTestMessageFeedback('Enviando mensagem de teste via Evolution API...');

    const res = await whatsappService.sendDirectViaGateway(
      settingsForm.whatsapp_api_url,
      settingsForm.whatsapp_api_token,
      testWhatsAppPhone,
      testMsg
    );

    if (res?.success) {
      setTestMessageFeedback('✅ Mensagem entregue com sucesso diretamente no seu WhatsApp!');
    } else {
      whatsappService.openWhatsApp(testWhatsAppPhone, testMsg);
      setTestMessageFeedback('Disparo iniciado no WhatsApp Web / App!');
    }
    setTimeout(() => setTestMessageFeedback(''), 6000);
  };

  // ===================== AÇÕES DE CATEGORIAS =====================
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    await catalogService.saveCategory(categoryForm);
    setShowCategoryModal(false);
    setCategoryForm({ id: null, name: '', description: '', sort_order: 1 });
    await loadCatalog();
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria? Os pratos vinculados ficarão sem categoria.')) {
      await catalogService.deleteCategory(id);
      await loadCatalog();
    }
  };

  // ===================== AÇÕES DE PRATOS =====================
  const handleSaveDish = async (e) => {
    e.preventDefault();
    setDishUploadLoading(true);

    try {
      let finalImageUrl = dishForm.image_url;
      if (dishImageFile) {
        finalImageUrl = await catalogService.uploadImage(dishImageFile, 'dishes-images');
      }

      await catalogService.saveDish({
        ...dishForm,
        image_url: finalImageUrl,
        price: parseFloat(dishForm.price) || 0,
        promotional_price: dishForm.promotional_price ? parseFloat(dishForm.promotional_price) : null,
      });

      setShowDishModal(false);
      setDishImageFile(null);
      setDishForm({
        id: null,
        name: '',
        category_id: categories[0]?.id || '',
        description: '',
        price: '',
        promotional_price: '',
        image_url: '',
        active: true,
      });
      await loadCatalog();
    } finally {
      setDishUploadLoading(false);
    }
  };

  const handleDeleteDish = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este prato?')) {
      await catalogService.deleteDish(id);
      await loadCatalog();
    }
  };

  // ===================== AÇÕES DE CONFIGURAÇÃO DA LOJA =====================
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setUploadingLogo(true);

    try {
      let logoUrl = settingsForm.logo_url;
      let faviconUrl = settingsForm.favicon_url;

      if (logoFile) {
        logoUrl = await catalogService.uploadImage(logoFile, 'restaurant-assets');
      }
      if (faviconFile) {
        faviconUrl = await catalogService.uploadImage(faviconFile, 'restaurant-assets');
      }

      const updated = await restaurantService.updateRestaurantSettings({
        ...settingsForm,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        delivery_fee: parseFloat(settingsForm.delivery_fee) || 0,
        minimum_order: parseFloat(settingsForm.minimum_order) || 0,
      });

      onRestaurantUpdate(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    } finally {
      setUploadingLogo(false);
    }
  };

  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Topo do Painel */}
      <div className="bg-dark text-white py-3 border-bottom border-secondary">
        <div className="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger fs-6 py-2 px-3">ADMIN</span>
            <h4 className="mb-0 fw-bold">Painel de Gestão do Restaurante</h4>
          </div>
          <button
            type="button"
            className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
            onClick={onExitAdmin}
          >
            <i className="bi bi-box-arrow-left"></i>
            <span>Voltar ao Cardápio Público</span>
          </button>
        </div>
      </div>

      <div className="container mt-4">
        {/* Navegação entre Abas */}
        <ul className="nav nav-pills nav-fill bg-white p-2 rounded-4 shadow-sm border mb-4">
          <li className="nav-item">
            <button
              className={`nav-link fw-bold py-2 rounded-3 ${activeTab === 'orders' ? 'active bg-primary' : 'text-dark'}`}
              onClick={() => setActiveTab('orders')}
            >
              <i className="bi bi-kanban me-2"></i> Fila de Pedidos ({orders.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link fw-bold py-2 rounded-3 ${activeTab === 'catalog' ? 'active bg-primary' : 'text-dark'}`}
              onClick={() => setActiveTab('catalog')}
            >
              <i className="bi bi-card-checklist me-2"></i> Pratos & Categorias ({dishes.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link fw-bold py-2 rounded-3 ${activeTab === 'settings' ? 'active bg-primary' : 'text-dark'}`}
              onClick={() => setActiveTab('settings')}
            >
              <i className="bi bi-gear-fill me-2"></i> Configurações & WhatsApp
            </button>
          </li>
        </ul>

        {/* ==================================================================== */}
        {/* ABA 1: FILA DE PEDIDOS */}
        {/* ==================================================================== */}
        {activeTab === 'orders' && (
          <div>
            {/* Filtros de Status */}
            <div className="d-flex flex-wrap gap-2 mb-3 align-items-center justify-content-between">
              <div className="d-flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Todos os Pedidos' },
                  { key: 'pending', label: 'Pendentes' },
                  { key: 'confirmed', label: 'Confirmados' },
                  { key: 'preparing', label: 'Na Cozinha' },
                  { key: 'out_for_delivery', label: 'Em Rota' },
                  { key: 'delivered', label: 'Entregues' },
                  { key: 'cancelled', label: 'Cancelados' },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`btn btn-sm ${statusFilter === f.key ? 'btn-dark' : 'btn-outline-secondary'} rounded-pill`}
                    onClick={() => setStatusFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={loadOrders}
                disabled={loadingOrders}
              >
                <i className={`bi bi-arrow-clockwise ${loadingOrders ? 'spin' : ''}`}></i>
                <span>Atualizar</span>
              </button>
            </div>

            {/* Lista / Cards de Pedidos na Fila */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white p-5 rounded-4 border text-center text-muted">
                <i className="bi bi-emoji-smile fs-1 d-block mb-2"></i>
                <h6 className="fw-bold">Nenhum pedido encontrado com este filtro</h6>
                <small>Novos pedidos recebidos aparecerão aqui automaticamente.</small>
              </div>
            ) : (
              <div className="row g-3">
                {filteredOrders.map((ord) => {
                  const addr = ord.delivery_address || {};
                  return (
                    <div key={ord.id} className="col-12 col-lg-6 col-xl-4">
                      <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                        {/* Header do Card */}
                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold fs-6">#{ord.order_number || ord.id.substring(0, 5)}</span>
                            <small className="text-muted d-block">
                              {new Date(ord.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                          <span className="badge bg-primary px-3 py-2 rounded-pill small">
                            {whatsappService.getStatusLabel(ord.status)}
                          </span>
                        </div>

                        {/* Corpo do Card */}
                        <div className="card-body p-3">
                          <div className="mb-2">
                            <span className="fw-bold">{ord.customer_name}</span>
                            <div className="text-muted small d-flex align-items-center gap-1">
                              <i className="bi bi-whatsapp text-success"></i> {ord.customer_phone}
                            </div>
                          </div>

                          <div className="bg-light p-2 rounded-3 small mb-3">
                            <span className="text-muted d-block mb-1 fw-bold">Endereço de Entrega:</span>
                            <div>{addr.street}, {addr.number} {addr.complement ? `(${addr.complement})` : ''}</div>
                            <div className="text-muted">{addr.neighborhood} - {addr.city}</div>
                          </div>

                          <div className="mb-3">
                            <span className="text-muted small fw-bold d-block mb-1">Itens:</span>
                            <ul className="small mb-0 ps-3">
                              {(ord.items || ord.order_items || []).map((it, idx) => (
                                <li key={idx}>
                                  <strong>{it.quantity}x</strong> {it.dish_name || it.name}
                                  {it.notes && <div className="text-muted fst-italic">Obs: {it.notes}</div>}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {ord.notes && (
                            <div className="alert alert-warning py-1 px-2 small rounded-3 mb-2">
                              <strong>Obs Geral:</strong> {ord.notes}
                            </div>
                          )}

                          <div className="d-flex justify-content-between align-items-center border-top pt-2">
                            <small className="text-muted">Forma: {ord.payment_method}</small>
                            <span className="fw-bold text-success fs-6">{formatCurrency(ord.total_amount)}</span>
                          </div>
                        </div>

                        {/* Ações de Transição de Status e WhatsApp */}
                        <div className="card-footer bg-light p-3 border-top d-flex flex-column gap-2">
                          {/* Botões de Avanço de Status */}
                          <div className="btn-group w-100" role="group">
                            {ord.status === 'pending' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary fw-bold"
                                onClick={() => handleUpdateStatus(ord, 'confirmed')}
                              >
                                <i className="bi bi-check2-circle me-1"></i> Aceitar Pedido
                              </button>
                            )}
                            {ord.status === 'confirmed' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-warning text-dark fw-bold"
                                onClick={() => handleUpdateStatus(ord, 'preparing')}
                              >
                                <i className="bi bi-fire me-1"></i> Mandar p/ Cozinha
                              </button>
                            )}
                            {ord.status === 'preparing' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-info text-white fw-bold"
                                onClick={() => handleUpdateStatus(ord, 'out_for_delivery')}
                              >
                                <i className="bi bi-bicycle me-1"></i> Despachar Entrega
                              </button>
                            )}
                            {ord.status === 'out_for_delivery' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success fw-bold"
                                onClick={() => handleUpdateStatus(ord, 'delivered')}
                              >
                                <i className="bi bi-check-all me-1"></i> Marcar Entregue
                              </button>
                            )}
                            {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleUpdateStatus(ord, 'cancelled')}
                                title="Cancelar pedido"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>

                          {/* Notificar no WhatsApp */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-1"
                            onClick={() => handleNotifyCustomer(ord)}
                          >
                            <i className="bi bi-whatsapp"></i>
                            <span>Notificar Cliente via WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* ABA 2: GESTÃO DO CARDÁPIO (CATEGORIAS E PRATOS) */}
        {/* ==================================================================== */}
        {activeTab === 'catalog' && (
          <div>
            {/* Bloco de Categorias */}
            <div className="bg-white p-4 rounded-4 shadow-sm border mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-0">Categorias de Pratos</h5>
                  <small className="text-muted">Organize os grupos do seu cardápio</small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary rounded-pill d-flex align-items-center gap-1"
                  onClick={() => {
                    setCategoryForm({ id: null, name: '', description: '', sort_order: categories.length + 1 });
                    setShowCategoryModal(true);
                  }}
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>Nova Categoria</span>
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small">
                    <tr>
                      <th>Ordem</th>
                      <th>Nome da Categoria</th>
                      <th>Descrição</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td style={{ width: '80px' }}>
                          <span className="badge bg-secondary">{c.sort_order || 1}</span>
                        </td>
                        <td className="fw-bold">{c.name}</td>
                        <td className="text-muted small">{c.description || '-'}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-primary me-2"
                            onClick={() => {
                              setCategoryForm(c);
                              setShowCategoryModal(true);
                            }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger"
                            onClick={() => handleDeleteCategory(c.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bloco de Pratos */}
            <div className="bg-white p-4 rounded-4 shadow-sm border">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                <div>
                  <h5 className="fw-bold mb-0">Pratos & Itens do Cardápio</h5>
                  <small className="text-muted">Adicione fotos, preços e descrições dos pratos</small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-brand rounded-pill d-flex align-items-center gap-1"
                  onClick={() => {
                    setDishForm({
                      id: null,
                      name: '',
                      category_id: categories[0]?.id || '',
                      description: '',
                      price: '',
                      promotional_price: '',
                      image_url: '',
                      active: true,
                    });
                    setDishImageFile(null);
                    setShowDishModal(true);
                  }}
                >
                  <i className="bi bi-plus-circle-fill"></i>
                  <span>Novo Prato</span>
                </button>
              </div>

              {/* Filtro de Categoria no Catálogo */}
              <div className="d-flex gap-2 mb-3 overflow-auto pb-2">
                <button
                  type="button"
                  className={`btn btn-sm ${selectedCategoryTab === 'all' ? 'btn-dark' : 'btn-outline-secondary'} rounded-pill`}
                  onClick={() => setSelectedCategoryTab('all')}
                >
                  Todos ({dishes.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn btn-sm ${selectedCategoryTab === c.id ? 'btn-dark' : 'btn-outline-secondary'} rounded-pill`}
                    onClick={() => setSelectedCategoryTab(c.id)}
                  >
                    {c.name} ({dishes.filter((d) => d.category_id === c.id).length})
                  </button>
                ))}
              </div>

              {/* Tabela de Pratos */}
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small">
                    <tr>
                      <th>Foto</th>
                      <th>Nome do Prato</th>
                      <th>Categoria</th>
                      <th>Preço</th>
                      <th>Promocional</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dishes
                      .filter((d) => selectedCategoryTab === 'all' || d.category_id === selectedCategoryTab)
                      .map((d) => {
                        const cat = categories.find((c) => c.id === d.category_id);
                        return (
                          <tr key={d.id}>
                            <td style={{ width: '70px' }}>
                              <img
                                src={d.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80'}
                                alt={d.name}
                                className="rounded-3 shadow-sm"
                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                              />
                            </td>
                            <td>
                              <div className="fw-bold">{d.name}</div>
                              <small className="text-muted d-block text-truncate" style={{ maxWidth: '280px' }}>
                                {d.description}
                              </small>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                {cat?.name || 'Sem categoria'}
                              </span>
                            </td>
                            <td className="fw-semibold">{formatCurrency(d.price)}</td>
                            <td>
                              {d.promotional_price ? (
                                <span className="badge bg-success">{formatCurrency(d.promotional_price)}</span>
                              ) : (
                                <span className="text-muted small">-</span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-primary me-2"
                                onClick={() => {
                                  setDishForm({
                                    id: d.id,
                                    name: d.name,
                                    category_id: d.category_id || '',
                                    description: d.description || '',
                                    price: d.price,
                                    promotional_price: d.promotional_price || '',
                                    image_url: d.image_url || '',
                                    active: d.active !== false,
                                  });
                                  setDishImageFile(null);
                                  setShowDishModal(true);
                                }}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger"
                                onClick={() => handleDeleteDish(d.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ABA 3: CONFIGURAÇÕES DA LOJA & WHATSAPP */}
        {/* ==================================================================== */}
        {activeTab === 'settings' && (
          <div className="bg-white p-4 rounded-4 shadow-sm border">
            <h5 className="fw-bold mb-1">Configurações do Restaurante & Notificações</h5>
            <p className="text-muted small mb-4">
              Personalize o nome, logotipos, modo de vendas (com pagamentos ou encomendas) e números de WhatsApp.
            </p>

            {settingsSuccess && (
              <div className="alert alert-success py-2 px-3 rounded-3 small mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill"></i>
                <span>Configurações salvas e aplicadas com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings}>
              <div className="row g-3">
                {/* 1. Identidade e Textos */}
                <div className="col-12 col-md-6">
                  <label htmlFor="cfgRestaurantName" className="form-label small fw-bold">Nome do Restaurante</label>
                  <input
                    id="cfgRestaurantName"
                    type="text"
                    className="form-control rounded-3"
                    value={settingsForm.name || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="cfgAddressText" className="form-label small fw-bold">Endereço Físico</label>
                  <input
                    id="cfgAddressText"
                    type="text"
                    className="form-control rounded-3"
                    value={settingsForm.address_text || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address_text: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="cfgDescription" className="form-label small fw-bold">Descrição / Slogan</label>
                  <textarea
                    id="cfgDescription"
                    className="form-control rounded-3"
                    rows="2"
                    value={settingsForm.description || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  ></textarea>
                </div>

                {/* 2. Logos e Favicons */}
                <div className="col-12 col-md-6">
                  <label htmlFor="cfgLogoFile" className="form-label small fw-bold">
                    <i className="bi bi-image me-1"></i> Logotipo da Loja
                  </label>
                  <input
                    id="cfgLogoFile"
                    type="file"
                    className="form-control rounded-3 mb-2"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files[0])}
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-3"
                    placeholder="Ou cole a URL da imagem do Logo..."
                    value={settingsForm.logo_url || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="cfgFaviconFile" className="form-label small fw-bold">
                    <i className="bi bi-app-indicator me-1"></i> Favicon (Ícone do Navegador)
                  </label>
                  <input
                    id="cfgFaviconFile"
                    type="file"
                    className="form-control rounded-3 mb-2"
                    accept="image/*"
                    onChange={(e) => setFaviconFile(e.target.files[0])}
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-3"
                    placeholder="Ou cole a URL do Favicon..."
                    value={settingsForm.favicon_url || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, favicon_url: e.target.value })}
                  />
                </div>

                {/* 3. Números de WhatsApp */}
                <div className="col-12 col-md-6">
                  <label htmlFor="cfgWhatsappClient" className="form-label small fw-bold">
                    <i className="bi bi-whatsapp text-success me-1"></i> WhatsApp de Atendimento ao Cliente
                  </label>
                  <input
                    id="cfgWhatsappClient"
                    type="text"
                    className="form-control rounded-3"
                    placeholder="Ex: 5511999999999"
                    value={settingsForm.phone_whatsapp || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone_whatsapp: e.target.value })}
                    required
                  />
                  <div className="form-text small">Número com código de país (Ex: 55 para Brasil) e DDD.</div>
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="cfgWhatsappAdmin" className="form-label small fw-bold">
                    <i className="bi bi-bell-fill text-warning me-1"></i> WhatsApp de Notificações do Administrador
                  </label>
                  <input
                    id="cfgWhatsappAdmin"
                    type="text"
                    className="form-control rounded-3"
                    placeholder="Ex: 5511999998888"
                    value={settingsForm.admin_notification_whatsapp || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, admin_notification_whatsapp: e.target.value })}
                  />
                  <div className="form-text small">Número que receberá alertas automáticos de novos pedidos.</div>
                </div>

                {/* Gateway Opcional (Evolution API, Z-API ou Twilio) */}
                <div className="col-12 col-md-6">
                  <label htmlFor="cfgGatewayUrl" className="form-label small fw-bold">
                    <i className="bi bi-cpu text-info me-1"></i> URL do Gateway WhatsApp (Opcional)
                  </label>
                  <input
                    id="cfgGatewayUrl"
                    type="text"
                    className="form-control rounded-3"
                    placeholder="Ex: https://api.evolution.exemplo.com"
                    value={settingsForm.whatsapp_api_url || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_api_url: e.target.value })}
                  />
                  <div className="form-text small">Para disparo 100% automático em background (deixe em branco para usar WhatsApp Web gratuito).</div>
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="cfgGatewayToken" className="form-label small fw-bold">
                    <i className="bi bi-key text-info me-1"></i> Token do Gateway WhatsApp (Opcional)
                  </label>
                  <input
                    id="cfgGatewayToken"
                    type="password"
                    className="form-control rounded-3"
                    placeholder="••••••••••••••••"
                    value={settingsForm.whatsapp_api_token || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_api_token: e.target.value })}
                  />
                  <div className="form-text small">Token de autorização da sua instância de WhatsApp.</div>
                </div>

                {/* CARD DE CONEXÃO WHATSAPP VIA QR CODE */}
                <div className="col-12">
                  <div className="p-3 rounded-4 border bg-white shadow-sm">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white"
                          style={{ width: '36px', height: '36px', backgroundColor: '#25D366' }}
                        >
                          <i className="bi bi-qr-code fs-5"></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-0">Conectar WhatsApp do Restaurante (QR Code)</h6>
                          <small className="text-muted">Aponte a câmera do seu WhatsApp em Aparelhos Conectados</small>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm fw-bold d-flex align-items-center gap-1"
                        disabled={loadingQr}
                        onClick={async () => {
                          setLoadingQr(true);
                          setQrFeedback('');
                          try {
                            const url = settingsForm.whatsapp_api_url || 'https://evolution-api-latest-ypge.onrender.com';
                            const token = settingsForm.whatsapp_api_token || 'cardapio_evolution_secret_2026';
                            const qrData = await whatsappService.fetchInstanceQrCode(url, token, 'cardapio_demo');
                            if (qrData?.base64) {
                              setQrCodeImage(qrData.base64);
                              setQrFeedback('QR Code gerado! Aponte o WhatsApp do celular.');
                            } else if (qrData?.instance?.state === 'open' || qrData?.state === 'open') {
                              setQrCodeImage(null);
                              setQrFeedback('✅ WhatsApp já está conectado e autenticado!');
                            } else {
                              setQrFeedback('Aguardando inicialização da instância ou WhatsApp já conectado.');
                            }
                          } catch (e) {
                            setQrFeedback('Erro ao conectar com a Evolution API. Verifique as credenciais.');
                          } finally {
                            setLoadingQr(false);
                          }
                        }}
                      >
                        {loadingQr ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span>Buscando QR Code...</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-arrow-repeat"></i>
                            <span>Gerar / Atualizar QR Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    {qrFeedback && (
                      <div className="alert alert-info py-2 px-3 small mt-2 mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-info-circle"></i>
                        <span>{qrFeedback}</span>
                      </div>
                    )}

                    {qrCodeImage && (
                      <div className="text-center py-3 bg-light rounded-3 mt-2">
                        <img
                          src={qrCodeImage.startsWith('data:') ? qrCodeImage : `data:image/png;base64,${qrCodeImage}`}
                          alt="QR Code WhatsApp"
                          className="img-fluid rounded-3 shadow-sm border p-2 bg-white"
                          style={{ maxWidth: '240px' }}
                        />
                        <div className="small text-muted mt-2">
                          <i className="bi bi-phone me-1"></i> No seu celular: <strong>WhatsApp ➔ Configurações ➔ Aparelhos Conectados ➔ Conectar um aparelho</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD DE TESTE DE DISPARO DE WHATSAPP */}
                <div className="col-12">
                  <div className="p-3 rounded-4 border bg-light shadow-sm">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white"
                        style={{ width: '32px', height: '32px', backgroundColor: '#25D366' }}
                      >
                        <i className="bi bi-whatsapp"></i>
                      </div>
                      <h6 className="fw-bold mb-0">🧪 Validação & Teste de Mensagem WhatsApp</h6>
                    </div>
                    <p className="text-muted small mb-3">
                      Envie uma mensagem de teste para o seu próprio WhatsApp para verificar a formatação de status que os clientes recebem.
                    </p>

                    {testMessageFeedback && (
                      <div className="alert alert-success py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle-fill"></i>
                        <span>{testMessageFeedback}</span>
                      </div>
                    )}

                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-sm-5">
                        <label className="form-label small text-muted">Telefone para Teste (com DDD)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-3"
                          placeholder="5511999999999"
                          value={testWhatsAppPhone}
                          onChange={(e) => setTestWhatsAppPhone(e.target.value)}
                        />
                      </div>

                      <div className="col-12 col-sm-4">
                        <label className="form-label small text-muted">Status do Pedido a Simular</label>
                        <select
                          className="form-select form-select-sm rounded-3"
                          value={testWhatsAppStatus}
                          onChange={(e) => setTestWhatsAppStatus(e.target.value)}
                        >
                          <option value="pending">🟡 Pedido Recebido</option>
                          <option value="confirmed">🔵 Confirmado pelo Restaurante</option>
                          <option value="preparing">👨‍🍳 Em Preparo na Cozinha</option>
                          <option value="out_for_delivery">🛵 Saiu para Entrega</option>
                          <option value="delivered">✅ Entregue com Sucesso</option>
                        </select>
                      </div>

                      <div className="col-12 col-sm-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-success w-100 fw-bold d-flex align-items-center justify-content-center gap-1 py-2"
                          onClick={handleRunWhatsAppTest}
                        >
                          <i className="bi bi-send-check-fill"></i>
                          <span>Testar Disparo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Modo de Operação (Com Pagamento ou Somente Encomendas) */}
                <div className="col-12 col-md-6">
                  <label htmlFor="cfgModeSelect" className="form-label small fw-bold">Modo de Operação do Cardápio</label>
                  <select
                    id="cfgModeSelect"
                    className="form-select rounded-3"
                    value={settingsForm.mode || 'with_payment'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, mode: e.target.value })}
                  >
                    <option value="with_payment">Com Métodos de Pagamento (Pix, Cartão, Dinheiro)</option>
                    <option value="orders_only">Somente Encomendas (Envio direto para WhatsApp)</option>
                  </select>
                </div>

                {/* 5. Status da Loja: Aberto ou Fechado */}
                <div className="col-12 col-md-6">
                  <label htmlFor="cfgIsOpenSelect" className="form-label small fw-bold">Status de Funcionamento</label>
                  <select
                    id="cfgIsOpenSelect"
                    className="form-select rounded-3"
                    value={settingsForm.is_open ? 'open' : 'closed'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, is_open: e.target.value === 'open' })}
                  >
                    <option value="open">🟢 Loja Aberta (Recebendo pedidos)</option>
                    <option value="closed">🔴 Loja Fechada (Apenas visualização)</option>
                  </select>
                </div>

                {/* 6. Taxas e Pedido Mínimo */}
                <div className="col-12 col-sm-6">
                  <label htmlFor="cfgDeliveryFee" className="form-label small fw-bold">Taxa de Entrega Padrão (R$)</label>
                  <input
                    id="cfgDeliveryFee"
                    type="number"
                    step="0.01"
                    className="form-control rounded-3"
                    value={settingsForm.delivery_fee ?? 0}
                    onChange={(e) => setSettingsForm({ ...settingsForm, delivery_fee: e.target.value })}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label htmlFor="cfgMinOrder" className="form-label small fw-bold">Pedido Mínimo (R$)</label>
                  <input
                    id="cfgMinOrder"
                    type="number"
                    step="0.01"
                    className="form-control rounded-3"
                    value={settingsForm.minimum_order ?? 0}
                    onChange={(e) => setSettingsForm({ ...settingsForm, minimum_order: e.target.value })}
                  />
                </div>

                {/* 7. Cores de Personalização do Tema */}
                <div className="col-6 col-sm-3">
                  <label htmlFor="cfgPrimaryColor" className="form-label small fw-bold">Cor Primária</label>
                  <input
                    id="cfgPrimaryColor"
                    type="color"
                    className="form-control form-control-color w-100 rounded-3"
                    value={settingsForm.primary_color || '#e63946'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, primary_color: e.target.value })}
                  />
                </div>

                <div className="col-6 col-sm-3">
                  <label htmlFor="cfgSecondaryColor" className="form-label small fw-bold">Cor Secundária</label>
                  <input
                    id="cfgSecondaryColor"
                    type="color"
                    className="form-control form-control-color w-100 rounded-3"
                    value={settingsForm.secondary_color || '#1d3557'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, secondary_color: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-top">
                <button
                  type="submit"
                  className="btn btn-brand px-4 py-2 fw-bold d-flex align-items-center gap-2"
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-save"></i>
                  )}
                  <span>Salvar Todas as Configurações</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ===================== MODAL DE CATEGORIA ===================== */}
      {showCategoryModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {categoryForm.id ? 'Editar Categoria' : 'Nova Categoria'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCategoryModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveCategory}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label htmlFor="catFormName" className="form-label small fw-bold">Nome da Categoria *</label>
                    <input
                      id="catFormName"
                      type="text"
                      className="form-control rounded-3"
                      placeholder="Ex: Hambúrgueres Artesanais"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="catFormDesc" className="form-label small fw-bold">Descrição</label>
                    <input
                      id="catFormDesc"
                      type="text"
                      className="form-control rounded-3"
                      placeholder="Ex: Carnes nobres preparadas na brasa"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="catFormSort" className="form-label small fw-bold">Ordem de Exibição</label>
                    <input
                      id="catFormSort"
                      type="number"
                      className="form-control rounded-3"
                      value={categoryForm.sort_order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowCategoryModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold">
                    Salvar Categoria
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE PRATO ===================== */}
      {showDishModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {dishForm.id ? 'Editar Prato' : 'Adicionar Novo Prato'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDishModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveDish}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-8">
                      <label htmlFor="dishFormName" className="form-label small fw-bold">Nome do Prato *</label>
                      <input
                        id="dishFormName"
                        type="text"
                        className="form-control rounded-3"
                        placeholder="Ex: Burger Bacon Cheddar"
                        value={dishForm.name}
                        onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label htmlFor="dishFormCat" className="form-label small fw-bold">Categoria *</label>
                      <select
                        id="dishFormCat"
                        className="form-select rounded-3"
                        value={dishForm.category_id}
                        onChange={(e) => setDishForm({ ...dishForm, category_id: e.target.value })}
                        required
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label htmlFor="dishFormDesc" className="form-label small fw-bold">Descrição Completa</label>
                      <textarea
                        id="dishFormDesc"
                        className="form-control rounded-3"
                        rows="2"
                        placeholder="Descreva ingredientes, acompanhamentos e diferenciais..."
                        value={dishForm.description}
                        onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label htmlFor="dishFormPrice" className="form-label small fw-bold">Preço Normal (R$) *</label>
                      <input
                        id="dishFormPrice"
                        type="number"
                        step="0.01"
                        className="form-control rounded-3"
                        placeholder="29.90"
                        value={dishForm.price}
                        onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label htmlFor="dishFormPromoPrice" className="form-label small fw-bold">Preço Promocional (Opcional)</label>
                      <input
                        id="dishFormPromoPrice"
                        type="number"
                        step="0.01"
                        className="form-control rounded-3"
                        placeholder="24.90"
                        value={dishForm.promotional_price}
                        onChange={(e) => setDishForm({ ...dishForm, promotional_price: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="dishFormImgFile" className="form-label small fw-bold">
                        <i className="bi bi-camera me-1"></i> Imagem do Prato
                      </label>
                      <input
                        id="dishFormImgFile"
                        type="file"
                        className="form-control rounded-3 mb-2"
                        accept="image/*"
                        onChange={(e) => setDishImageFile(e.target.files[0])}
                      />
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-3"
                        placeholder="Ou digite a URL da imagem..."
                        value={dishForm.image_url}
                        onChange={(e) => setDishForm({ ...dishForm, image_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowDishModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-brand fw-bold"
                    disabled={dishUploadLoading}
                  >
                    {dishUploadLoading ? 'Salvando...' : 'Salvar Prato'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE NOTIFICAÇÃO WHATSAPP ===================== */}
      <WhatsAppNotificationModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setWhatsAppModalOrder(null);
          setWhatsAppModalStatus(null);
        }}
        order={whatsAppModalOrder}
        newStatus={whatsAppModalStatus}
        restaurant={restaurant}
      />
    </div>
  );
}
