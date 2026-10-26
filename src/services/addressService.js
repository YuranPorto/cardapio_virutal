import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const ADDRESSES_KEY_PREFIX = 'cardapio_addresses_user_';

export const addressService = {
  async getAddresses(userId) {
    if (!userId) return [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false });

        if (!error && data) {
          localStorage.setItem(`${ADDRESSES_KEY_PREFIX}${userId}`, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Erro ao carregar endereços do Supabase:', err);
      }
    }

    const cached = localStorage.getItem(`${ADDRESSES_KEY_PREFIX}${userId}`);
    return cached ? JSON.parse(cached) : [];
  },

  async addAddress(userId, addressData) {
    if (!userId) return null;

    let addresses = await this.getAddresses(userId);

    // Se for o primeiro ou marcado como padrão, remover is_default dos outros
    if (addressData.is_default || addresses.length === 0) {
      addressData.is_default = true;
      addresses = addresses.map((a) => ({ ...a, is_default: false }));
    }

    let newAddress = {
      ...addressData,
      id: addressData.id || `addr-${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('customer_addresses')
          .insert([{ ...newAddress, id: undefined }])
          .select()
          .single();

        if (!error && data) {
          newAddress = data;
        }
      } catch (err) {
        console.warn('Erro ao salvar endereço no Supabase:', err);
      }
    }

    addresses.unshift(newAddress);
    localStorage.setItem(`${ADDRESSES_KEY_PREFIX}${userId}`, JSON.stringify(addresses));
    return newAddress;
  },

  async setDefaultAddress(userId, addressId) {
    let addresses = await this.getAddresses(userId);
    addresses = addresses.map((a) => ({
      ...a,
      is_default: a.id === addressId,
    }));

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', userId);

        await supabase
          .from('customer_addresses')
          .update({ is_default: true })
          .eq('id', addressId);
      } catch (err) {
        console.warn('Erro ao definir endereço padrão no Supabase:', err);
      }
    }

    localStorage.setItem(`${ADDRESSES_KEY_PREFIX}${userId}`, JSON.stringify(addresses));
    return addresses;
  },

  async deleteAddress(userId, addressId) {
    let addresses = await this.getAddresses(userId);
    addresses = addresses.filter((a) => a.id !== addressId);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('customer_addresses').delete().eq('id', addressId);
      } catch (err) {
        console.warn('Erro ao deletar endereço no Supabase:', err);
      }
    }

    // Se apagou o padrão e ainda restarem endereços, torna o primeiro em padrão
    if (addresses.length > 0 && !addresses.some((a) => a.is_default)) {
      addresses[0].is_default = true;
    }

    localStorage.setItem(`${ADDRESSES_KEY_PREFIX}${userId}`, JSON.stringify(addresses));
    return addresses;
  },
};
