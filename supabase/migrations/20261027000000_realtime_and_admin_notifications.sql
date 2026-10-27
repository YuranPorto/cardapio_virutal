-- ==============================================================================
-- MIGRAÇÃO: Habilitação de Supabase Realtime e Configuração de Notificação Admin
-- ==============================================================================

-- 1. Adicionar coluna para controle de notificação no WhatsApp do administrador
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS notify_admin_whatsapp BOOLEAN DEFAULT true;

-- 2. Permitir leitura pública dos pedidos para acompanhamento em tempo real (visitante e cadastrado)
DROP POLICY IF EXISTS "Cliente visualiza seus próprios pedidos" ON public.orders;
CREATE POLICY "Cliente visualiza seus próprios pedidos"
    ON public.orders FOR SELECT
    USING (true);

-- 3. Habilitar Supabase Realtime na tabela de pedidos e logs
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_logs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
