import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialRestaurantData } from './mockData';

const RESTAURANT_STORAGE_KEY = 'cardapio_restaurant_settings';

export const restaurantService = {
  async getRestaurantSettings(slug = 'default') {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (!error && data) {
          this.applyBrandingToDOM(data);
          localStorage.setItem(RESTAURANT_STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Supabase offline ou tabela inexistente, usando dados locais:', err);
      }
    }

    // Fallback: LocalStorage ou Mock Inicial
    const cached = localStorage.getItem(RESTAURANT_STORAGE_KEY);
    const result = cached ? JSON.parse(cached) : initialRestaurantData;
    this.applyBrandingToDOM(result);
    return result;
  },

  async updateRestaurantSettings(updatedData) {
    // Atualiza local primeiro para feedback instantâneo
    localStorage.setItem(RESTAURANT_STORAGE_KEY, JSON.stringify(updatedData));
    this.applyBrandingToDOM(updatedData);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .upsert({
            ...updatedData,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'slug' })
          .select()
          .single();

        if (error) throw error;
        return data || updatedData;
      } catch (err) {
        console.error('Erro ao salvar no Supabase:', err);
      }
    }

    return updatedData;
  },

  applyBrandingToDOM(data) {
    if (!data) return;

    // Atualiza o Title da página
    if (data.name) {
      document.title = `${data.name} | Cardápio Virtual`;
    }

    // Atualiza o Favicon
    if (data.favicon_url) {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = data.favicon_url;
    }

    // Aplica variáveis CSS globais de cor
    if (data.primary_color) {
      document.documentElement.style.setProperty('--brand-primary', data.primary_color);
    }
    if (data.secondary_color) {
      document.documentElement.style.setProperty('--brand-secondary', data.secondary_color);
    }
  },
};
