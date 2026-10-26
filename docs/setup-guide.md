# Guia de Configuração e Implantação para o Cliente

Este guia detalha todo o processo para configurar o **Cardápio Virtual Dinâmico** utilizando o **Supabase** e implantar o frontend.

---

## 1. Passo a Passo no Supabase

### 1.1 Criar o Projeto e Rodar as Migrações SQL
1. Acesse o painel do seu projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. No menu lateral esquerdo, clique no ícone **SQL Editor**.
3. Clique em **New query**.
4. Abra o arquivo `supabase/migrations/20261026000000_schema_and_security.sql` deste projeto, copie todo o seu conteúdo e cole no editor do Supabase.
5. Clique em **Run**.
   - Isso criará todas as tabelas, tipos enumerados, triggers de atualização, regras estritas de Row Level Security (RLS) e os buckets de storage (`restaurant-assets` e `dishes-images`).

### 1.2 Configurar Provedores de Autenticação (Social Login)
1. No menu lateral, acesse **Authentication** -> **Providers**.
2. **Google**:
   - Ative o provedor Google.
   - Insira o *Client ID* e *Client Secret* obtidos no Google Cloud Console.
   - Adicione o link de redirecionamento fornecido pelo Supabase nas credenciais do Google Cloud.
3. **Facebook / Meta**:
   - Ative o provedor Facebook.
   - Insira o *App ID* e *App Secret* obtidos no Meta for Developers.
   - *Nota sobre Instagram*: A autenticação com Instagram via Meta usa o mesmo ecossistema do Facebook Login / Instagram Graph API for Creators/Business. Ativando o Facebook Login você permite login com as contas conectadas ao ecossistema Meta.
4. **Email / Senha**:
   - Certifique-se de que o provedor de Email está ativado.

### 1.3 Promover o Primeiro Usuário a Administrador (Admin)
Após criar a sua conta de usuário (seja por email ou login social):
1. Acesse **Authentication** -> **Users** e copie o **User UID** do seu usuário.
2. Acesse o **SQL Editor** e execute:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = 'COLE_AQUI_O_UUID_DO_SEU_USUARIO';
   ```
Pronto! Este usuário agora terá acesso liberado ao **Painel Administrativo** da aplicação.

---

## 2. Deploy das Edge Functions (Opcional se usar Gateways de WhatsApp)

Se você for utilizar envio automático via servidor ou gateways (como Evolution API ou Z-API):
1. Instale a CLI do Supabase:
   ```bash
   npm install -g supabase
   ```
2. Faça login e vincule o projeto:
   ```bash
   supabase login
   supabase link --project-ref elwlmlxnurbdpcnkzxqq
   ```
3. Realize o deploy das funções:
   ```bash
   supabase functions deploy send-whatsapp-notification
   supabase functions deploy order-status-update
   ```
4. Configure as variáveis de ambiente das funções (caso use gateway):
   ```bash
   supabase secrets set WHATSAPP_GATEWAY_URL="https://seu-gateway.com"
   supabase secrets set WHATSAPP_GATEWAY_TOKEN="seu-token"
   ```

*Caso o restaurante não utilize um gateway pago, o cardápio conta com **disparo instantâneo e gratuito via WhatsApp Web/App** pelo link oficial `wa.me/` integrado na fila e no checkout!*

---

## 3. Execução e Deploy do Frontend

### 3.1 Rodar Localmente
```bash
# 1. Instalar dependências (caso ainda não o tenha feito)
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:5173`.

### 3.2 Build de Produção
```bash
npm run build
```
A pasta `dist` gerada pode ser hospedada em qualquer serviço moderno (Vercel, Netlify, Cloudflare Pages, AWS S3/CloudFront).
