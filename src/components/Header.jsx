import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

export function Header({
  restaurant,
  onOpenAuth,
  onOpenTracking,
  onToggleAdmin,
  isAdminView,
}) {
  const { user, profile, isAdmin, logout, loginAsMockAdmin } = useAuth();
  const { totalCount, setIsDrawerOpen } = useCart();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky-top glass-header py-2 py-md-3">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between gap-2">
          {/* Logo e Nome do Restaurante */}
          <div className="d-flex align-items-center gap-2 gap-md-3">
            {restaurant?.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="rounded-circle shadow-sm"
                style={{ width: '48px', height: '48px', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{ width: '48px', height: '48px', backgroundColor: 'var(--brand-primary)' }}
              >
                <i className="bi bi-shop fs-5"></i>
              </div>
            )}
            <div>
              <div className="d-flex align-items-center gap-2">
                <h1 className="h5 mb-0 fw-bold">{restaurant?.name || 'Cardápio Virtual'}</h1>
                <span
                  className={`badge rounded-pill ${
                    restaurant?.is_open ? 'bg-success' : 'bg-secondary'
                  } d-none d-sm-inline-block`}
                  style={{ fontSize: '0.7rem' }}
                >
                  <i className={`bi bi-circle-fill me-1 ${restaurant?.is_open ? 'text-white' : ''}`}></i>
                  {restaurant?.is_open ? 'Aberto Agora' : 'Fechado'}
                </span>
              </div>
              <small className="text-muted d-none d-md-block" style={{ fontSize: '0.8rem' }}>
                {restaurant?.description || 'Faça seu pedido online de forma rápida e segura'}
              </small>
            </div>
          </div>

          {/* Ações da Direita */}
          <div className="d-flex align-items-center gap-2">
            {/* Alternar Tema Claro / Escuro */}
            <button
              type="button"
              className="btn-theme-toggle"
              onClick={toggleTheme}
              title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              aria-label="Alternar tema claro e escuro"
            >
              <i className={`bi ${isDark ? 'bi-sun-fill text-warning' : 'bi-moon-stars-fill text-primary'}`}></i>
            </button>
            {/* Alternar Painel Admin */}
            {(isAdmin || !user) && (
              <button
                type="button"
                className={`btn btn-sm ${isAdminView ? 'btn-dark' : 'btn-outline-dark'} d-flex align-items-center gap-1`}
                onClick={isAdmin ? onToggleAdmin : loginAsMockAdmin}
                title={isAdmin ? (isAdminView ? 'Ver Cardápio' : 'Abrir Painel Admin') : 'Acessar modo Demonstração Admin'}
              >
                <i className={`bi ${isAdminView ? 'bi-grid-fill' : 'bi-shield-lock'}`}></i>
                <span className="d-none d-lg-inline">
                  {isAdminView ? 'Voltar ao Cardápio' : (isAdmin ? 'Painel Admin' : 'Demo Admin')}
                </span>
              </button>
            )}

            {/* Acompanhar Pedidos */}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={onOpenTracking}
              title="Acompanhar meus pedidos"
            >
              <i className="bi bi-clock-history"></i>
              <span className="d-none d-md-inline">Meus Pedidos</span>
            </button>

            {/* Usuário / Auth */}
            {user ? (
              <div className="dropdown">
                <button
                  className="btn btn-sm btn-light border dropdown-toggle d-flex align-items-center gap-1"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  onClick={(e) => {
                    const el = e.currentTarget.nextElementSibling;
                    if (el) el.classList.toggle('show');
                  }}
                >
                  <i className="bi bi-person-circle text-primary"></i>
                  <span className="d-none d-sm-inline fw-semibold text-truncate" style={{ maxWidth: '110px' }}>
                    {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-sm" aria-labelledby="userDropdown">
                  <li className="px-3 py-2 border-bottom">
                    <div className="fw-bold text-truncate">{profile?.full_name || 'Usuário'}</div>
                    <small className="text-muted d-block text-truncate">{user.email}</small>
                    {profile?.phone && (
                      <small className="text-success d-flex align-items-center gap-1 mt-1">
                        <i className="bi bi-whatsapp"></i> {profile.phone}
                      </small>
                    )}
                  </li>
                  {isAdmin && (
                    <li>
                      <button className="dropdown-item" onClick={onToggleAdmin}>
                        <i className="bi bi-speedometer2 me-2"></i>
                        {isAdminView ? 'Ver Cardápio' : 'Painel de Controle'}
                      </button>
                    </li>
                  )}
                  <li>
                    <button className="dropdown-item text-danger" onClick={logout}>
                      <i className="bi bi-box-arrow-right me-2"></i> Sair
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={onOpenAuth}
              >
                <i className="bi bi-person"></i>
                <span className="d-none d-sm-inline">Entrar</span>
              </button>
            )}

            {/* Carrinho de Compras */}
            {!isAdminView && (
              <button
                type="button"
                className="btn btn-brand d-flex align-items-center gap-2 position-relative"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Abrir carrinho de compras"
              >
                <i className="bi bi-bag-fill fs-6"></i>
                <span className="d-none d-sm-inline">Carrinho</span>
                {totalCount > 0 && (
                  <span className="badge bg-white text-danger fw-bold rounded-pill ms-1">
                    {totalCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
