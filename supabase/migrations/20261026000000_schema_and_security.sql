-- ==============================================================================
-- MIGRAÇÃO DE BANCO DE DADOS: CARDÁPIO VIRTUAL DINÂMICO
-- DATA: 2026-10-26
-- SUPABASE POSTGRESQL + ROW LEVEL SECURITY (RLS) + STORAGE BUCKETS
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS DE STATUS E PAGAMENTO
DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM (
        'pending',          -- Pedido recebido aguardando confirmação
        'confirmed',        -- Pedido aceito pelo restaurante
        'preparing',        -- Em preparo na cozinha
        'out_for_delivery', -- Saiu para entrega
        'delivered',        -- Entregue com sucesso
        'cancelled'         -- Pedido cancelado
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM (
        'orders_only',      -- Somente encomenda (sem checkout online)
        'with_payment'      -- Com opções de pagamento (online / na entrega / pix)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABELA DE CONFIGURAÇÃO DO RESTAURANTE / ESTABELECIMENTO
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL DEFAULT 'default',
    name TEXT NOT NULL DEFAULT 'Meu Restaurante',
    description TEXT DEFAULT 'Cardápio Virtual e Delivery',
    phone_whatsapp TEXT NOT NULL DEFAULT '',
    logo_url TEXT DEFAULT '',
    favicon_url TEXT DEFAULT '',
    banner_url TEXT DEFAULT '',
    primary_color TEXT DEFAULT '#e63946',
    secondary_color TEXT DEFAULT '#1d3557',
    mode payment_mode_enum NOT NULL DEFAULT 'with_payment',
    accept_pix BOOLEAN DEFAULT true,
    accept_card_on_delivery BOOLEAN DEFAULT true,
    accept_cash_on_delivery BOOLEAN DEFAULT true,
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    minimum_order DECIMAL(10,2) DEFAULT 0.00,
    is_open BOOLEAN DEFAULT true,
    address_text TEXT DEFAULT '',
    admin_notification_whatsapp TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir restaurante padrão se não existir
INSERT INTO public.restaurants (slug, name, description, phone_whatsapp)
VALUES ('default', 'Cardápio Gourmet', 'Sabor inigualável e entrega ágil', '5511999999999')
ON CONFLICT (slug) DO NOTHING;

-- 4. TABELA DE PERFIS DE USUÁRIOS (Clientes e Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE CATEGORIAS DE PRATOS
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE PRATOS / ITENS DO CARDÁPIO
CREATE TABLE IF NOT EXISTS public.dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    promotional_price DECIMAL(10,2) DEFAULT NULL,
    image_url TEXT DEFAULT '',
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE ENDEREÇOS DO CLIENTE (Múltiplos endereços suportados)
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Casa', -- Casa, Trabalho, Outro
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT DEFAULT '',
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'SP',
    zip_code TEXT DEFAULT '',
    reference_point TEXT DEFAULT '',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number BIGSERIAL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address JSONB NOT NULL,
    status order_status_enum NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT DEFAULT '',
    whatsapp_notified_admin BOOLEAN DEFAULT false,
    whatsapp_notified_customer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA DE ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL,
    dish_name TEXT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELA DE LOGS DE FILA DE PEDIDOS E HISTÓRICO
CREATE TABLE IF NOT EXISTS public.order_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS E FUNÇÕES
-- ==============================================================================

-- Trigger para sincronizar criação de usuário no auth.users para public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role TEXT;
BEGIN
    -- Se o e-mail for yuranporto@gmail.com, recebe role 'admin' automaticamente
    IF (LOWER(COALESCE(NEW.email, '')) = 'yuranporto@gmail.com') THEN
        assigned_role := 'admin';
    ELSE
        assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    END IF;

    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        assigned_role
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        role = CASE WHEN LOWER(COALESCE(NEW.email, '')) = 'yuranporto@gmail.com' THEN 'admin' ELSE public.profiles.role END,
        phone = CASE WHEN public.profiles.phone = '' THEN EXCLUDED.phone ELSE public.profiles.phone END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para registrar logs de mudança de status de pedido
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.order_status_logs (order_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status::TEXT, NEW.status::TEXT, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_status_changed ON public.orders;
CREATE TRIGGER trg_order_status_changed
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

-- Helper para verificar se usuário logado é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        (auth.jwt() ->> 'email') = 'yuranporto@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. RESTAURANTS: Leitura pública, modificação apenas por admin
DROP POLICY IF EXISTS "Restaurante visível publicamente" ON public.restaurants;
CREATE POLICY "Restaurante visível publicamente"
    ON public.restaurants FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin pode gerenciar configurações do restaurante" ON public.restaurants;
CREATE POLICY "Admin pode gerenciar configurações do restaurante"
    ON public.restaurants FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 2. CATEGORIES: Leitura pública dos itens ativos (ou tudo para admin), modificação apenas por admin
DROP POLICY IF EXISTS "Categorias ativas visíveis publicamente" ON public.categories;
CREATE POLICY "Categorias ativas visíveis publicamente"
    ON public.categories FOR SELECT
    USING (active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin pode gerenciar categorias" ON public.categories;
CREATE POLICY "Admin pode gerenciar categorias"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 3. DISHES: Leitura pública dos pratos ativos (ou tudo para admin), modificação apenas por admin
DROP POLICY IF EXISTS "Pratos ativos visíveis publicamente" ON public.dishes;
CREATE POLICY "Pratos ativos visíveis publicamente"
    ON public.dishes FOR SELECT
    USING (active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin pode gerenciar pratos" ON public.dishes;
CREATE POLICY "Admin pode gerenciar pratos"
    ON public.dishes FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. PROFILES: Usuário pode ler e alterar seu próprio perfil; Admin pode ler perfis para atendimento
DROP POLICY IF EXISTS "Usuário acessa próprio perfil" ON public.profiles;
CREATE POLICY "Usuário acessa próprio perfil"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Usuário atualiza próprio perfil" ON public.profiles;
CREATE POLICY "Usuário atualiza próprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 5. CUSTOMER_ADDRESSES: Isolado por usuário
DROP POLICY IF EXISTS "Usuário gerencia seus próprios endereços" ON public.customer_addresses;
CREATE POLICY "Usuário gerencia seus próprios endereços"
    ON public.customer_addresses FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin pode consultar endereços para despacho de pedidos" ON public.customer_addresses;
CREATE POLICY "Admin pode consultar endereços para despacho de pedidos"
    ON public.customer_addresses FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 6. ORDERS:
DROP POLICY IF EXISTS "Cliente visualiza seus próprios pedidos" ON public.orders;
CREATE POLICY "Cliente visualiza seus próprios pedidos"
    ON public.orders FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Cliente ou visitante pode criar pedido" ON public.orders;
CREATE POLICY "Cliente ou visitante pode criar pedido"
    ON public.orders FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin pode atualizar pedidos e status na fila" ON public.orders;
CREATE POLICY "Admin pode atualizar pedidos e status na fila"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7. ORDER_ITEMS:
DROP POLICY IF EXISTS "Acesso aos itens do pedido compatível com a ordem" ON public.order_items;
CREATE POLICY "Acesso aos itens do pedido compatível com a ordem"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Permite inserção de itens de pedido no checkout" ON public.order_items;
CREATE POLICY "Permite inserção de itens de pedido no checkout"
    ON public.order_items FOR INSERT
    WITH CHECK (true);

-- 8. ORDER_STATUS_LOGS:
DROP POLICY IF EXISTS "Logs visíveis pelo dono do pedido ou admin" ON public.order_status_logs;
CREATE POLICY "Logs visíveis pelo dono do pedido ou admin"
    ON public.order_status_logs FOR SELECT
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_logs.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- STORAGE BUCKETS (Imagens de Pratos e Logos)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('restaurant-assets', 'restaurant-assets', true),
    ('dishes-images', 'dishes-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao storage para visualização pública
DROP POLICY IF EXISTS "Visualização pública de mídias de pratos" ON storage.objects;
CREATE POLICY "Visualização pública de mídias de pratos"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('restaurant-assets', 'dishes-images'));

DROP POLICY IF EXISTS "Admin faz upload e gerencia imagens" ON storage.objects;
CREATE POLICY "Admin faz upload e gerencia imagens"
    ON storage.objects FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- 11. ATRIBUIÇÃO AUTOMÁTICA DO ADMIN PRINCIPAL
-- ==============================================================================
DO $$
BEGIN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id IN (
        SELECT id FROM auth.users WHERE LOWER(email) = 'yuranporto@gmail.com'
    );
END $$;

