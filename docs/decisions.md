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

## ADR 005: Suporte a Modo Claro e Escuro (Light/Dark Theme)
- **Data**: 2026-10-26
- **Status**: Aceito
- **Contexto**: Clientes e operadores de restaurante utilizam a aplicação em diferentes ambientes de iluminação (cozinha, salão à noite, delivery noturno, ambiente externo diurno).
- **Decisão**: Implementação de `ThemeContext` com persistência em `localStorage`, detecção automática de `prefers-color-scheme` do sistema operacional e estilização integrada via `data-bs-theme="dark"` do Bootstrap 5 + variáveis CSS em HSL/HEX no design system.
- **Consequência**: Melhoria significativa na ergonomia visual e acessibilidade sem comprometer o contraste dos pratos e fotografias.

## ADR 006: Garantia de Envio de Notificações WhatsApp sem Bloqueio de Popups
- **Data**: 2026-10-26
- **Status**: Substituído / Refinado
- **Contexto**: Navegadores modernos bloqueiam chamadas `window.open` assíncronas.
- **Decisão Inicial**: Modal de envio semi-automático.
- **Evolução Atual**: O cliente acompanha o pedido 100% pelo site via Supabase Realtime (dispensando WhatsApp ao cliente). O WhatsApp fica restrito ao alerta automático para o número do restaurante quando configurado.

## ADR 007: Otimização de Realtime no Admin (Apenas INSERT) e Carga Mínima no Banco
- **Data**: 2026-10-27
- **Status**: Aceito
- **Contexto**: Quando o painel administrativo altera o status de um pedido (ex: "Aceitar", "Na Cozinha", "Saiu p/ Entrega"), escutar eventos de `UPDATE` geraria um ciclo desnecessário de notificações e requisições adicionais de rede no próprio painel.
- **Decisão**:
  1. **Admin escuta EXCLUSIVAMENTE eventos `INSERT`**: O painel só recebe notificações do Supabase Realtime quando um cliente submete um NOVO pedido.
  2. **Inserção Pontual**: Ao receber o `INSERT`, o frontend busca estritamente o pedido recém-criado via `getOrderById` (1 linha + itens), evitando recarregar toda a tabela de pedidos (`getAllOrders`).
  3. **Atualização Otimista no Admin**: As transições de status feitas pelo operador atualizam o estado local de forma imediata (sem latência e sem refetch). A alteração é salva no banco e o evento `UPDATE` é consumido apenas pelo cliente na tela de rastreamento.
  4. **Eliminação de Polling Agressivo**: O polling contínuo a cada 20 segundos foi removido, poupando conexões e CPU do PostgreSQL, mantendo um botão de atualização manual para contingências.
- **Consequência**: Carga quase nula no banco de dados durante o expediente, sem loops de renderização e resposta instantânea para o operador da cozinha.

## ADR 008: Compressão Client-Side no Navegador (.webp) e Cloudflare R2
- **Data**: 2026-10-27
- **Status**: Aceito
- **Contexto**: Fotos de pratos e logos tiradas com smartphones modernos possuem entre 4 MB e 8 MB, causando lentidão no upload e esgotando cotas de armazenamento e tráfego.
- **Decisão**: Interceptar o upload no navegador do lojista via `browser-image-compression`, reduzindo largura para máx. 800px, qualidade a 80% e convertendo para `.webp` em background (Web Worker). O arquivo reduzido (~60-80 KB) é despachado para o Cloudflare R2 (sem taxas de tráfego de saída / egress).
- **Consequência**: Economia de ~98% de armazenamento e tráfego, upload praticamente instantâneo mesmo em redes móveis 3G/4G.

## ADR 009: Notificação Sonora Nativa Sintetizada via Web Audio API
- **Data**: 2026-10-27
- **Status**: Aceito
- **Contexto**: Painéis de gestão de restaurante precisam alertar audivelmente a cozinha sobre novos pedidos. Tradicionalmente, sistemas utilizam arquivos de áudio externos (`.mp3` ou `.wav`), que enfrentam falhas comuns: download lento, problemas de cache HTTP, bloqueios de CORS, ou falta de suporte offline.
- **Decisão**: Síntese de áudio puramente nativa através da **Web Audio API** do navegador (`AudioContext`, `OscillatorNode` e `GainNode`). Criou-se uma melodia agradável de sino duplo com decaimento exponencial, gerada 100% em tempo de execução via software no próprio aparelho do operador.
- **Consequência**: Zero dependência de arquivos externos, zero uso de banda ou cache, resposta instantânea em milissegundos e suporte total a alternância de som ativo/mudo com persistência local.
