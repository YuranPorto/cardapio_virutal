import React, { useState, useEffect } from 'react';

export function DishModal({ dish, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setQuantity(1);
    setNotes('');
  }, [dish]);

  if (!dish) return null;

  const unitPrice = Number(dish.promotional_price || dish.price);
  const subtotal = unitPrice * quantity;

  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleAdd = () => {
    onAddToCart(dish, quantity, notes);
    onClose();
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          {/* Imagem do Prato */}
          <div className="position-relative" style={{ height: '240px', backgroundColor: '#e2e8f0' }}>
            <img
              src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
              alt={dish.name}
              className="w-100 h-100"
              style={{ objectFit: 'cover' }}
            />
            <button
              type="button"
              className="btn btn-dark btn-sm rounded-circle position-absolute top-0 end-0 m-3 d-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px', opacity: 0.85 }}
              onClick={onClose}
              aria-label="Fechar"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="modal-body p-4">
            <h2 className="h5 fw-bold mb-1">{dish.name}</h2>
            <p className="text-muted small mb-3">{dish.description}</p>

            <div className="d-flex align-items-center gap-2 mb-4">
              <span className="fs-5 fw-bold text-success">{formatCurrency(unitPrice)}</span>
              {dish.promotional_price && (
                <span className="text-muted text-decoration-line-through small">
                  {formatCurrency(dish.price)}
                </span>
              )}
            </div>

            {/* Campo de Observações */}
            <div className="mb-4">
              <label htmlFor="dishNotes" className="form-label small fw-semibold text-muted">
                <i className="bi bi-pencil-square me-1"></i> Observações para a cozinha:
              </label>
              <textarea
                id="dishNotes"
                className="form-control rounded-3"
                rows="2"
                placeholder="Ex: sem cebola, ponto da carne bem passado, pouco sal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            {/* Controles de Quantidade e Adicionar */}
            <div className="d-flex align-items-center justify-content-between gap-3 pt-3 border-top">
              <div className="d-flex align-items-center border rounded-pill p-1 bg-light">
                <button
                  type="button"
                  className="btn btn-sm btn-white rounded-circle shadow-none"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <i className="bi bi-dash"></i>
                </button>
                <span className="px-3 fw-bold">{quantity}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-white rounded-circle shadow-none"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <i className="bi bi-plus"></i>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-brand flex-grow-1 d-flex align-items-center justify-content-between"
                onClick={handleAdd}
              >
                <span>Adicionar</span>
                <span className="fw-bold">{formatCurrency(subtotal)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
