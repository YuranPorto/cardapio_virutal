import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { restaurantService } from './services/restaurantService';
import { catalogService } from './services/catalogService';
import { Header } from './components/Header';
import { DemoBanner } from './components/DemoBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { DishCard } from './components/DishCard';
import { DishModal } from './components/DishModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AdminDashboard } from './components/admin/AdminDashboard';

function MainApp() {
  const { user } = useAuth();
  const { addItem } = useCart();

  // Estados do Restaurante e Catálogo
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros e Pesquisa
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modais
  const [selectedDishDetail, setSelectedDishDetail] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      try {
        const [restData, cats, dshs] = await Promise.all([
          restaurantService.getRestaurantSettings('default'),
          catalogService.getCategories(),
          catalogService.getDishes(),
        ]);
        setRestaurant(restData);
        setCategories(cats);
        setDishes(dshs);
      } catch (err) {
        console.error('Erro ao carregar dados do cardápio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtragem dos pratos
  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = selectedCategory === null || dish.category_id === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dish.description && dish.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch && dish.active !== false;
  });

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-danger mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Carregando cardápio...</span>
        </div>
        <h6 className="fw-bold text-muted">Carregando cardápio virtual...</h6>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-main">
      {/* Banner de Ambiente de Demonstração */}
      <DemoBanner />

      {/* Topo / Header */}
      <Header
        restaurant={restaurant}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onToggleAdmin={() => setIsAdminView(!isAdminView)}
        isAdminView={isAdminView}
      />

      {/* Conteúdo Principal: Ou Painel Admin ou Cardápio Público */}
      {isAdminView ? (
        <AdminDashboard
          restaurant={restaurant}
          onRestaurantUpdate={(updated) => setRestaurant(updated)}
          onExitAdmin={() => setIsAdminView(false)}
        />
      ) : (
        <main className="flex-grow-1 pb-5">
          <div className="container py-3 py-md-4">
            {/* Banner de Boas-Vindas Gastronômico */}
            <div
              className="hero-banner mb-4"
              style={{
                backgroundImage: `url(${restaurant?.banner_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80'})`,
              }}
            >
              <div className="hero-overlay"></div>
              <div className="hero-content">
                <span className="badge bg-warning text-dark fw-bold mb-2 px-3 py-2 rounded-pill">
                  {restaurant?.mode === 'orders_only' ? '📦 Encomendas via WhatsApp' : '⚡ Pedidos com Entrega Ágil'}
                </span>
                <h2 className="display-6 fw-bold mb-2">{restaurant?.name}</h2>
                <p className="lead mb-0 fs-6 text-white text-opacity-90 max-w-700">
                  {restaurant?.description}
                </p>
                {restaurant?.address_text && (
                  <small className="d-block mt-2 text-white text-opacity-75">
                    <i className="bi bi-geo-alt-fill me-1"></i> {restaurant.address_text}
                  </small>
                )}
              </div>
            </div>

            {/* Filtros de Categorias e Campo de Busca */}
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(id) => setSelectedCategory(id)}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
              dishes={dishes}
            />

            {/* Grid de Pratos do Cardápio */}
            <div className="row mt-2">
              {filteredDishes.length === 0 ? (
                <div className="col-12 py-5 text-center text-muted">
                  <i className="bi bi-search fs-1 d-block mb-3"></i>
                  <h5 className="fw-bold">Nenhum prato encontrado</h5>
                  <p className="small">Tente buscar por outro termo ou selecione outra categoria.</p>
                </div>
              ) : (
                filteredDishes.map((dish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    onOpenDetail={(d) => setSelectedDishDetail(d)}
                    onQuickAdd={(d) => addItem(d, 1, '')}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {/* Rodapé Moderno */}
      {!isAdminView && (
        <footer className="bg-white border-top py-4 mt-auto">
          <div className="container text-center">
            <div className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold mb-2">
              <i className="bi bi-shield-exclamation me-1"></i> AMBIENTE DE DEMONSTRAÇÃO E TESTES
            </div>
            <p className="small text-muted mb-2" style={{ maxWidth: '640px', margin: '0 auto', fontSize: '0.8rem' }}>
              Este cardápio é uma aplicação interativa desenvolvida para apresentação técnica e portfólio.
              Todos os pedidos, pagamentos e rastreamentos são fictícios. Nenhuma cobrança financeira real é realizada.
            </p>
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <span className="fw-bold">{restaurant?.name}</span>
              <span className="text-muted">•</span>
              <small className="text-muted">Cardápio Virtual White-Label</small>
            </div>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              © {new Date().getFullYear()} Todos os direitos reservados.
            </small>
          </div>
        </footer>
      )}

      {/* Modais e Componentes Flutuantes */}
      <DishModal
        dish={selectedDishDetail}
        onClose={() => setSelectedDishDetail(null)}
        onAddToCart={(dish, qty, notes) => addItem(dish, qty, notes)}
      />

      <CartDrawer
        restaurant={restaurant}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        restaurant={restaurant}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOrderSuccess={() => setIsTrackingOpen(true)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        restaurant={restaurant}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <MainApp />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
