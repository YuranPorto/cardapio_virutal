import React from 'react';
import { useCart } from '../context/CartContext';

export function CartDrawer({ restaurant, onProceedToCheckout }) {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    isDrawerOpen,
    setIsDrawerOpen,
    totalCount,
    subtotal,
    total,
  } = useCart();

  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const minimumOrder = Number(restaurant?.minimum_order || 0);
  const isMinimumMet = subtotal >= minimumOrder;

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="offcanvas-backdrop fade show"
        onClick={() => setIsDrawerOpen(false)}
        style={{ zIndex: 1045 }}
      ></div>

      {/* Drawer */}
      <div
        className="offcanvas offcanvas-end show offcanvas-cart d-flex flex-column"
        tabIndex="-1"
        style={{ zIndex: 1050 }}
      >
        {/* Cabeçalho */}
        <div className="offcanvas-header border-bottom py-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-bag-check-fill text-danger fs-5"></i>
            <h5 className="offcanvas-title fw-bold">Seu Pedido ({totalCount})</h5>
          </div>
          <button
            type="button"
            className="btn-close text-reset"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Fechar"
          ></button>
        </div>

        {/* Lista de Itens */}
        <div className="offcanvas-body p-3 flex-grow-1 overflow-auto">
          {items.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-cart-x text-muted" style={{ fontSize: '3rem' }}></i>
              <h6 className="mt-3 fw-bold">Sua sacola está vazia</h6>
              <p className="text-muted small">
                Adicione itens deliciosos do nosso cardápio para começar seu pedido!
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary mt-2"
                onClick={() => setIsDrawerOpen(false)}
              >
                Explorar Cardápio
              </button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted fw-semibold">Itens adicionados</small>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger text-decoration-none p-0"
                  onClick={clearCart}
                >
                  Limpar
                </button>
              </div>

              {items.map((item, index) => {
                const itemPrice = Number(item.dish.promotional_price || item.dish.price);
                const itemTotal = itemPrice * item.quantity;

                return (
                  <div
                    key={`${item.dish.id}-${index}`}
                    className="p-3 rounded-3 border bg-white shadow-sm d-flex gap-3 align-items-center"
                  >
                    <img
                      src={item.dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80'}
                      alt={item.dish.name}
                      className="rounded-2"
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    />
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-0 fw-bold small text-truncate" style={{ maxWidth: '170px' }}>
                          {item.dish.name}
                        </h6>
                        <span className="small fw-bold text-success">
                          {formatCurrency(itemTotal)}
                        </span>
                      </div>
                      {item.notes && (
                        <small className="text-muted d-block fst-italic text-truncate" style={{ maxWidth: '180px' }}>
                          Obs: {item.notes}
                        </small>
                      )}

                      <div className="d-flex align-items-center justify-content-between mt-2">
                        <div className="d-flex align-items-center border rounded-pill bg-light px-1">
                          <button
                            type="button"
                            className="btn btn-sm p-0 px-2 text-muted"
                            onClick={() => updateQuantity(index, -1)}
                          >
                            <i className="bi bi-dash"></i>
                          </button>
                          <span className="small fw-bold px-1">{item.quantity}</span>
                          <button
                            type="button"
                            className="btn btn-sm p-0 px-2 text-muted"
                            onClick={() => updateQuantity(index, 1)}
                          >
                            <i className="bi bi-plus"></i>
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-link btn-sm text-muted p-0"
                          onClick={() => removeItem(index)}
                          title="Remover item"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé e Checkout */}
        {items.length > 0 && (
          <div className="p-3 bg-white border-top shadow-lg">
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>Subtotal:</span>
              <span className="fw-semibold text-dark">{formatCurrency(subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between small text-muted mb-2">
              <span>Taxa de Entrega:</span>
              <span className="fw-semibold text-dark">
                {Number(restaurant?.delivery_fee) > 0
                  ? formatCurrency(restaurant.delivery_fee)
                  : 'Grátis'}
              </span>
            </div>
            <div className="d-flex justify-content-between fs-5 fw-bold mb-3 border-top pt-2">
              <span>Total:</span>
              <span className="text-success">{formatCurrency(total)}</span>
            </div>

            {!isMinimumMet && (
              <div className="alert alert-warning py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>Pedido mínimo: {formatCurrency(minimumOrder)}</span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-brand w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
              disabled={!isMinimumMet}
              onClick={() => {
                setIsDrawerOpen(false);
                onProceedToCheckout();
              }}
            >
              <span>Avançar para Entrega</span>
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
