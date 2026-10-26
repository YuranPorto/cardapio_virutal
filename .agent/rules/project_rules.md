# Regras do Projeto: Cardápio Virtual Dinâmico

## Arquitetura e Tecnologias
- **Front-end**: React 18+ (Vite) com Bootstrap 5 e Bootstrap Icons para componentes responsivos e estilização moderna.
- **Back-end e Banco**: Supabase (PostgreSQL, Auth com OAuth/Email, Storage para imagens, Edge Functions para automações e notificações).
- **Segurança**: Políticas RLS (Row Level Security) estritas em todas as tabelas. Nenhuma credencial restrita (ex: `service_role_key`) exposta no client-side. Apenas `anon_key` / `publishable_key` no front-end.
- **Notificações**: Mensagens estruturadas de WhatsApp para admin e clientes em criação e atualizações de status de pedidos.

## Padrões de Código
- Variáveis e funções em inglês ou português claro e consistente.
- Componentes modulares, desacoplados e tipados ou devidamente documentados com PropTypes / JSDoc.
- Estilos customizados organizados em CSS variables modernas (design system elegante) sem poluir ad-hoc.
- Manipulação de dados de entrega e telefone com validação rigorosa (DDI/DDD obrigatórios).
