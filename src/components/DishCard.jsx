import React from 'react';

export function DishCard({ dish, onOpenDetail, onQuickAdd }) {
  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const hasPromo = dish.promotional_price && Number(dish.promotional_price) < Number(dish.price);

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3 mb-4">
      <div className="dish-card" onClick={() => onOpenDetail(dish)} style={{ cursor: 'pointer' }}>
        {/* Imagem do Prato */}
        <div className="dish-image-wrapper">
          <img
            src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'}
            alt={dish.name}
            loading="lazy"
          />
          {hasPromo && (
            <div className="position-absolute top-0 start-0 m-2">
              <span className="badge-promo">PROMOÇÃO</span>
            </div>
          )}
        </div>

        {/* Informações do Prato */}
        <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
          <div>
            <h3 className="h6 fw-bold mb-1 text-truncate-2" title={dish.name}>
              {dish.name}
            </h3>
            <p
              className="text-muted small mb-3"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.4rem',
              }}
            >
              {dish.description || 'Delicioso prato preparado com ingredientes selecionados frescos.'}
            </p>
          </div>

          {/* Preço e Botão Adicionar */}
          <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto">
            <div>
              {hasPromo ? (
                <div className="d-flex flex-column">
                  <small className="text-muted text-decoration-line-through" style={{ fontSize: '0.75rem' }}>
                    {formatCurrency(dish.price)}
                  </small>
                  <span className="fw-bold text-success fs-6">
                    {formatCurrency(dish.promotional_price)}
                  </span>
                </div>
              ) : (
                <span className="fw-bold text-dark fs-6">{formatCurrency(dish.price)}</span>
              )}
            </div>

            <button
              type="button"
              className="btn btn-sm btn-brand-outline rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ width: '36px', height: '36px' }}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(dish);
              }}
              title="Adicionar ao carrinho"
            >
              <i className="bi bi-plus-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
