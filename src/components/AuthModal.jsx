import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthModal({ isOpen, onClose, onSuccess }) {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithOAuth,
    user,
    profile,
    updatePhone,
  } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'phone_required'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Formatação amigável de máscara de telefone (BR)
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    if (val.length > 6) {
      val = `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7)}`;
    } else if (val.length > 2) {
      val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
    }
    setPhone(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onSuccess?.();
        onClose();
      } else if (mode === 'register') {
        if (!phone || phone.replace(/\D/g, '').length < 10) {
          throw new Error('Informe seu WhatsApp com DDD para receber atualizações do pedido.');
        }
        await registerWithEmail(email, password, fullName, phone);
        onSuccess?.();
        onClose();
      } else if (mode === 'phone_required') {
        if (!phone || phone.replace(/\D/g, '').length < 10) {
          throw new Error('O número de WhatsApp é obrigatório para notificações.');
        }
        await updatePhone(phone);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao processar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithOAuth(provider);
      // Se não tiver telefone cadastrado, abre modo phone_required
      setMode('phone_required');
    } catch (err) {
      setErrorMsg(err.message || `Erro no login com ${provider}`);
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          {/* Header do Modal */}
          <div className="modal-header border-bottom py-3 px-4">
            <h5 className="modal-title fw-bold">
              {mode === 'login' && 'Entrar na sua conta'}
              {mode === 'register' && 'Criar sua conta'}
              {mode === 'phone_required' && 'WhatsApp Obrigatório para Notificações'}
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

            {/* Caso esteja no modo 'phone_required' (Ex: logou com Google/Facebook mas falta o telefone) */}
            {mode === 'phone_required' ? (
              <form onSubmit={handleSubmit}>
                <p className="text-muted small mb-3">
                  Para que possamos lhe enviar as atualizações do preparo e entrega do seu pedido em tempo real, precisamos do seu WhatsApp:
                </p>
                <div className="mb-3">
                  <label htmlFor="userPhoneRequired" className="form-label small fw-bold">
                    <i className="bi bi-whatsapp text-success me-1"></i> WhatsApp (com DDD):
                  </label>
                  <input
                    id="userPhoneRequired"
                    type="tel"
                    className="form-control rounded-3"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    required
                  />
                  <div className="form-text small">Obrigatório para o envio do status de entrega.</div>
                </div>

                <button
                  type="submit"
                  className="btn btn-brand w-100 py-2 fw-bold"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Confirmar e Continuar'}
                </button>
              </form>
            ) : (
              <>
                {/* Botões Rápidos de Social Login */}
                <div className="d-flex flex-column gap-2 mb-4">
                  <button
                    type="button"
                    className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-2 py-2 rounded-3"
                    onClick={() => handleOAuth('google')}
                    disabled={loading}
                  >
                    <i className="bi bi-google text-danger"></i>
                    <span>Continuar com Google</span>
                  </button>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3"
                      onClick={() => handleOAuth('facebook')}
                      disabled={loading}
                    >
                      <i className="bi bi-facebook"></i>
                      <span>Facebook</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3"
                      onClick={() => handleOAuth('instagram')}
                      disabled={loading}
                    >
                      <i className="bi bi-instagram"></i>
                      <span>Instagram</span>
                    </button>
                  </div>
                </div>

                <div className="position-relative text-center my-3">
                  <hr className="text-muted" />
                  <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
                    ou com email e senha
                  </span>
                </div>

                {/* Formulário Email & Senha */}
                <form onSubmit={handleSubmit}>
                  {mode === 'register' && (
                    <>
                      <div className="mb-3">
                        <label htmlFor="userFullName" className="form-label small fw-bold">Nome Completo</label>
                        <input
                          id="userFullName"
                          type="text"
                          className="form-control rounded-3"
                          placeholder="Seu nome"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="userPhone" className="form-label small fw-bold">
                          <i className="bi bi-whatsapp text-success me-1"></i> WhatsApp (com DDD) <span className="text-danger">*</span>
                        </label>
                        <input
                          id="userPhone"
                          type="tel"
                          className="form-control rounded-3"
                          placeholder="(11) 99999-9999"
                          value={phone}
                          onChange={handlePhoneChange}
                          required
                        />
                        <div className="form-text small">Indispensável para envio de atualizações.</div>
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label htmlFor="userEmail" className="form-label small fw-bold">E-mail</label>
                    <input
                      id="userEmail"
                      type="email"
                      className="form-control rounded-3"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="userPass" className="form-label small fw-bold">Senha</label>
                    <input
                      id="userPass"
                      type="password"
                      className="form-control rounded-3"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-brand w-100 py-2 fw-bold"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : null}
                    {mode === 'login' ? 'Acessar Conta' : 'Cadastrar'}
                  </button>
                </form>

                {/* Alternância de Modo */}
                <div className="text-center mt-3">
                  {mode === 'login' ? (
                    <small className="text-muted">
                      Não possui conta?{' '}
                      <button
                        type="button"
                        className="btn btn-link p-0 small fw-bold text-decoration-none"
                        onClick={() => {
                          setMode('register');
                          setErrorMsg('');
                        }}
                      >
                        Cadastre-se aqui
                      </button>
                    </small>
                  ) : (
                    <small className="text-muted">
                      Já possui conta?{' '}
                      <button
                        type="button"
                        className="btn btn-link p-0 small fw-bold text-decoration-none"
                        onClick={() => {
                          setMode('login');
                          setErrorMsg('');
                        }}
                      >
                        Faça login
                      </button>
                    </small>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
