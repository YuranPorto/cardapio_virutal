import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialCategories, initialDishes } from './mockData';
import { imageCompressionService } from './imageCompressionService';
import { r2StorageService } from './r2StorageService';

const CATEGORIES_KEY = 'cardapio_categories_data';
const DISHES_KEY = 'cardapio_dishes_data';

export const catalogService = {
  // ===================== CATEGORIAS =====================
  async getCategories() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          localStorage.setItem(CATEGORIES_KEY, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Erro ao carregar categorias do Supabase:', err);
      }
    }

    const cached = localStorage.getItem(CATEGORIES_KEY);
    if (cached) return JSON.parse(cached);

    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(initialCategories));
    return initialCategories;
  },

  async saveCategory(category) {
    let categories = await this.getCategories();
    let saved;

    if (category.id && !category.id.startsWith('new-')) {
      // Atualização
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('categories')
            .update(category)
            .eq('id', category.id)
            .select()
            .single();
          if (!error && data) saved = data;
        } catch (e) {
          console.warn('Falha Supabase categoria update:', e);
        }
      }
      categories = categories.map((c) => (c.id === category.id ? (saved || category) : c));
    } else {
      // Criação
      const newCategory = {
        ...category,
        id: category.id || `cat-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('categories')
            .insert([{ ...newCategory, id: undefined }])
            .select()
            .single();
          if (!error && data) newCategory.id = data.id;
        } catch (e) {
          console.warn('Falha Supabase categoria insert:', e);
        }
      }
      categories.push(saved || newCategory);
      saved = newCategory;
    }

    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    return saved;
  },

  async deleteCategory(id) {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (e) {
        console.warn('Erro ao deletar categoria no Supabase:', e);
      }
    }
    const categories = (await this.getCategories()).filter((c) => c.id !== id);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    return true;
  },

  // ===================== PRATOS / DISHES =====================
  async getDishes(categoryId = null) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('dishes')
          .select('*')
          .order('sort_order', { ascending: true });

        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          localStorage.setItem(DISHES_KEY, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Erro ao carregar pratos do Supabase:', err);
      }
    }

    const cached = localStorage.getItem(DISHES_KEY);
    let dishes = cached ? JSON.parse(cached) : initialDishes;
    if (categoryId) {
      dishes = dishes.filter((d) => d.category_id === categoryId);
    }
    return dishes;
  },

  async saveDish(dish) {
    let dishes = await this.getDishes();
    let saved;

    if (dish.id && !dish.id.startsWith('new-')) {
      // Atualizar
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('dishes')
            .update(dish)
            .eq('id', dish.id)
            .select()
            .single();
          if (!error && data) saved = data;
        } catch (e) {
          console.warn('Erro Supabase dish update:', e);
        }
      }
      dishes = dishes.map((d) => (d.id === dish.id ? (saved || dish) : d));
    } else {
      // Criar
      const newDish = {
        ...dish,
        id: dish.id || `dish-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('dishes')
            .insert([{ ...newDish, id: undefined }])
            .select()
            .single();
          if (!error && data) newDish.id = data.id;
        } catch (e) {
          console.warn('Erro Supabase dish insert:', e);
        }
      }
      dishes.push(saved || newDish);
      saved = newDish;
    }

    localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
    return saved;
  },

  async deleteDish(id) {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('dishes').delete().eq('id', id);
      } catch (e) {
        console.warn('Erro ao deletar prato no Supabase:', e);
      }
    }
    const dishes = (await this.getDishes()).filter((d) => d.id !== id);
    localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
    return true;
  },

  // ===================== OTIMIZAÇÃO & UPLOAD DE IMAGENS (CLOUDFLARE R2) =====================
  /**
   * Otimiza a foto no navegador antes do upload
   */
  async compressImage(file, options = {}) {
    return await imageCompressionService.compressImage(file, options);
  },

  /**
   * Comprime (máx 800px, .webp, 80% qualidade) e envia para Cloudflare R2
   */
  async uploadImage(file, folder = 'dishes', restaurantConfig = null) {
    if (!file) return null;

    // 1. Otimiza no cliente (reduz para máx 800px, converte para WebP, 75%-80% de qualidade)
    const compressionResult = await imageCompressionService.compressImage(file);
    const readyFile = compressionResult?.file || file;

    // 2. Envia para o Cloudflare R2 (com fallback automático transparente)
    return await r2StorageService.uploadToR2(readyFile, folder, restaurantConfig);
  },
};
