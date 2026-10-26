import React from 'react';

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  dishes,
}) {
  const getDishCount = (categoryId) => {
    if (!categoryId) return dishes.length;
    return dishes.filter((d) => d.category_id === categoryId).length;
  };

  return (
    <div className="py-3">
      {/* Barra de Pesquisa */}
      <div className="mb-3">
        <div className="input-group search-input-group shadow-sm rounded-4 overflow-hidden border">
          <span className="input-group-text bg-white border-0 ps-3 text-muted">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control border-0 shadow-none py-2"
            placeholder="Buscar prato, ingrediente ou bebida..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn btn-white bg-white border-0 text-muted pe-3"
              type="button"
              onClick={() => onSearchChange('')}
            >
              <i className="bi bi-x-circle-fill"></i>
            </button>
          )}
        </div>
      </div>

      {/* Carrossel / Lista de Categorias com Pills */}
      <div
        className="d-flex align-items-center gap-2 overflow-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          type="button"
          className={`category-pill ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => onSelectCategory(null)}
        >
          <i className="bi bi-stars"></i>
          <span>Todos</span>
          <small className="opacity-75 ms-1">({getDishCount(null)})</small>
        </button>

        {categories.map((cat) => {
          const count = getDishCount(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <span>{cat.name}</span>
              <small className="opacity-75 ms-1">({count})</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
