# Decisões de Arquitetura (ADR - Architectural Decision Records)

## ADR 001: Front-end com React + Bootstrap 5
- **Data**: 2026-10-26
- **Status**: Aceito
- **Contexto**: O cardápio precisa ser extremamente dinâmico, moderno, responsivo para dispositivos móveis (já que grande parte dos clientes acessa por smartphones no restaurante ou em casa) e com painel administrativo prático.
- **Decisão**: Utilização de React 18/19 com Vite para compilação ultrarrápida, Bootstrap 5 para grid flexível e componentes de interface consistentes, somado a variáveis CSS personalizadas (Glassmorphism, sombras suaves e micro-interações).
- **Consequência**: Excelente tempo de carregamento, responsividade mobile-first e facilidade de adaptação visual para diferentes marcas de restaurantes.

## ADR 002: Backend Serverless com Supabase (PostgreSQL + RLS + Storage)
- **Data**: 2026-10-26
- **Status**: Aceito
- **Contexto**: O cliente requisitou evitar servidores/APIs intermediárias dedicadas pesadas, priorizando simplicidade de infraestrutura com robustez em segurança e autorização de dados.
- **Decisão**: Toda a camada de dados é gerenciada via Supabase com PostgreSQL. A segurança entre perfis de clientes e painel administrativo é garantida no nível de banco via **Row Level Security (RLS)**.
- **Consequência**: Nenhuma tabela confidencial pode ser consultada ou alterada por usuários não autorizados, mesmo se houver inspeção de requisições no navegador.

## ADR 003: Notificações de Pedido via WhatsApp (Dual Mode: Web Link + Edge Function)
- **Data**: 2026-10-26
- **Status**: Aceito
- **Contexto**: Notificações precisam ser enviadas para o cliente e para o restaurante no momento do pedido e a cada transição de status na fila da cozinha.
- **Decisão**:
  1. **Modo Serverless/Gateway (Edge Function)**: Uma Edge Function em Deno/TypeScript no Supabase recebe o evento de novo pedido ou atualização de status e se conecta a uma API de WhatsApp (Evolution API, Z-API, Baileys ou Twilio).
  2. **Modo Direct/Fallback (WhatsApp Web / Deep Link)**: Formatação instantânea de mensagem codificada para envio direto via `wa.me/` com um clique, garantindo funcionamento mesmo que o restaurante ainda não tenha contratado um gateway de mensagens.
- **Consequência**: Alta resiliência e custo zero para pequenos estabelecimentos, com escalabilidade pronta para estabelecimentos de alto volume.

## ADR 004: Isolamento de Credenciais
- **Data**: 2026-10-26
- **Status**: Aceito
- **Contexto**: O frontend só deve conter chaves públicas (`anon_key` / `publishable_key`).
- **Decisão**: Credenciais de serviço (`service_role_key`) ficam estritamente confinadas em variáveis de ambiente das Edge Functions do Supabase e nunca no repositório público ou bundle client-side.
