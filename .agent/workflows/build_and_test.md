# Workflow: Build e Validação do Projeto

## 1. Verificação de Dependências e Build
```powershell
npm run build
```

## 2. Iniciar Servidor Local de Desenvolvimento
```powershell
npm run dev
```

## 3. Verificação de Migrações do Banco de Dados
- O arquivo principal de migração localiza-se em `supabase/migrations/20261026000000_schema_and_security.sql`.
- Deve ser aplicado no Supabase SQL Editor ou através do Supabase CLI com `supabase db push`.
