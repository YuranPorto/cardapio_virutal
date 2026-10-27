import React, { useState } from 'react';

export function DemoBanner() {
  const [isOpen, setIsOpen] = useState(true);
  const [showHowTo, setShowHowTo] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="btn btn-warning btn-sm position-fixed shadow-lg d-flex align-items-center gap-2 fw-bold"
        style={{
          bottom: '20px',
          right: '20px',
          zIndex: 1040,
          borderRadius: '50px',
          padding: '8px 16px',
        }}
        onClick={() => setIsOpen(true)}
        title="Abrir detalhes do Modo Demonstração"
      >
        <span className="spinner-grow spinner-grow-sm text-dark" role="status"></span>
        <span>Modo Demonstração Ativo</span>
      </button>
    );
  }

  return (
    <aside aria-label="Aviso de ambiente de testes" className="border-bottom text-dark position-relative shadow-sm" style={{ backgroundColor: '#fff3cd' }}>
      <div className="container py-2">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          {/* Lado Esquerdo: Badges e Aviso Principal */}
          <div className="d-flex align-items-center flex-wrap gap-2">
            <span className="badge bg-warning text-dark fw-bold px-2 py-1 d-inline-flex align-items-center gap-1 border border-warning-subtle">
              <i className="bi bi-cone-striped"></i>
              <span>VERSÃO DE DEMONSTRAÇÃO</span>
            </span>

            <span className="small fw-semibold text-dark">
              Projeto interativo de portfólio. Pedidos, cobranças e entregas são <strong>fictícios</strong>.
            </span>
          </div>

          {/* Lado Direito: Ações */}
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-dark btn-sm py-0 px-2 fw-semibold d-flex align-items-center gap-1"
              style={{ fontSize: '0.78rem' }}
              onClick={() => setShowHowTo(!showHowTo)}
            >
              <i className={`bi bi-${showHowTo ? 'chevron-up' : 'question-circle'}`}></i>
              <span>{showHowTo ? 'Ocultar Guia' : 'Como testar a demo?'}</span>
            </button>

            <button
              type="button"
              className="btn-close btn-close-dark btn-sm"
              style={{ fontSize: '0.65rem' }}
              aria-label="Minimizar aviso"
              onClick={() => setIsOpen(false)}
            ></button>
          </div>
        </div>

        {/* Guia Expansível de Testes */}
        {showHowTo && (
          <div className="mt-3 pt-2 border-top border-warning-subtle">
            <div className="row g-2 text-start">
              <div className="col-12 col-md-4">
                <div className="p-2 rounded-3 bg-white bg-opacity-75 h-100 border border-warning-subtle">
                  <div className="fw-bold small text-dark d-flex align-items-center gap-1">
                    <span className="badge bg-dark rounded-circle text-white p-1" style={{ width: '18px', height: '18px', lineHeight: '10px' }}>1</span>
                    <span>Monte o Pedido</span>
                  </div>
                  <p className="small text-muted mb-0 mt-1" style={{ fontSize: '0.78rem' }}>
                    Adicione itens ao carrinho, selecione opcionais ou observações do prato.
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="p-2 rounded-3 bg-white bg-opacity-75 h-100 border border-warning-subtle">
                  <div className="fw-bold small text-dark d-flex align-items-center gap-1">
                    <span className="badge bg-success rounded-circle text-white p-1" style={{ width: '18px', height: '18px', lineHeight: '10px' }}>2</span>
                    <span>Use seu WhatsApp Real</span>
                  </div>
                  <p className="small text-muted mb-0 mt-1" style={{ fontSize: '0.78rem' }}>
                    No checkout, informe seu celular com DDD para receber as notificações automáticas da Evolution API.
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="p-2 rounded-3 bg-white bg-opacity-75 h-100 border border-warning-subtle">
                  <div className="fw-bold small text-dark d-flex align-items-center gap-1">
                    <span className="badge bg-primary rounded-circle text-white p-1" style={{ width: '18px', height: '18px', lineHeight: '10px' }}>3</span>
                    <span>Sem Cobranças Reais</span>
                  </div>
                  <p className="small text-muted mb-0 mt-1" style={{ fontSize: '0.78rem' }}>
                    Nenhum valor é debitado de cartões ou contas. O rastreador em tempo real é 100% simulado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
