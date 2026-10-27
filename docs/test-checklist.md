# 📋 Checklist de Testes Manuais Diários

Este documento serve como guia e controle para execução dos testes manuais do **Cardápio Virtual White-Label**. 
Você pode marcar com `[x]` as tarefas conforme forem sendo validadas.

---

## 📅 Dados da Rodada de Teste
- **Data de Execução:** `____/____/________`
- **Responsável:** Yuran Porto
- **Ambiente:** [ ] Local (`localhost:5173`) | [ ] Demonstração (`dev`) | [ ] Produção (`main`)

---

## 1. 🛒 Experiência do Cliente & Catálogo

| Status | ID | Cenário de Teste | O que observar |
| :---: | :---: | :--- | :--- |
| [ ] | TC-01 | **Navegação por Categorias** | Clicar nas abas de categorias e verificar se a listagem filtra corretamente. |
| [ ] | TC-02 | **Busca de Itens** | Digitar o nome de um prato ou ingrediente no campo de busca e checar a resposta rápida. |
| [ ] | TC-03 | **Modal de Detalhes do Prato** | Clicar em um item para abrir o modal, alterar a quantidade e preencher observações (ex: "Sem cebola"). |
| [ ] | TC-04 | **Carrinho Offcanvas** | Adicionar 2 ou mais itens ao carrinho, alterar quantidades (+/-), remover um item e validar o subtotal e total. |
| [ ] | TC-05 | **Alternância de Tema (Dark/Light)** | Alternar o botão de tema no cabeçalho e verificar legibilidade, contraste e persistência ao atualizar a página. |

---

## 2. 💳 Checkout e Criação de Pedido

| Status | ID | Cenário de Teste | O que observar |
| :---: | :---: | :--- | :--- |
| [ ] | TC-06 | **Formulário de Checkout** | Clicar em "Avançar para Checkout", preencher nome, telefone (com DDD) e endereço completo de entrega. |
| [ ] | TC-07 | **Formas de Pagamento** | Alternar entre PIX, Cartão na Entrega e Dinheiro e conferir o resumo de valores. |
| [ ] | TC-08 | **Envio do Pedido** | Clicar em "Confirmar e Enviar Pedido": o modal de checkout deve fechar e abrir automaticamente o rastreador de pedidos. |
| [ ] | TC-09 | **Sem WhatsApp para o Cliente** | O cliente **NÃO** deve receber mensagens de WhatsApp (o acompanhamento é 100% pelo site). |

---

## 3. ⚡ Acompanhamento em Tempo Real (Supabase Realtime)

| Status | ID | Cenário de Teste | O que observar |
| :---: | :---: | :--- | :--- |
| [ ] | TC-10 | **Conexão Realtime no Rastreamento** | No modal de tracking, conferir o selo verde pulsante `🟢 Ao Vivo (Realtime)`. |
| [ ] | TC-11 | **Atualização Automática sem F5** | Manter a tela do cliente aberta no modal de tracking. Em outra aba/janela (Painel Admin), mudar o status para **"Na Cozinha"** ou **"A Caminho"**. O stepper do cliente deve atualizar **instantaneamente** sem dar F5. |
| [ ] | TC-12 | **Histórico de Pedidos** | Abrir o modal de rastreamento pelo botão do cabeçalho e validar se o pedido recém-criado consta na lista com os detalhes e itens corretos. |

---

## 4. 📲 Notificação WhatsApp para o Administrador

| Status | ID | Cenário de Teste | O que observar |
| :---: | :---: | :--- | :--- |
| [ ] | TC-13 | **Recebimento de Novo Pedido no WhatsApp** | Ao finalizar um pedido no checkout, o número de WhatsApp configurado para o restaurante deve receber a mensagem: `🔔 NOVO PEDIDO RECEBIDO!`. |
| [ ] | TC-14 | **Formatação da Mensagem do Admin** | A mensagem recebida no WhatsApp deve conter: número do pedido, nome e telefone do cliente, lista de itens com valores, forma de pagamento e link direto para responder o cliente. |
| [ ] | TC-15 | **Chave Liga/Desliga de Notificações** | No Painel Admin ➔ Configurações, desativar a chave *"Receber Alertas de Novos Pedidos no WhatsApp do Restaurante"*. Fazer um novo pedido e checar que nenhuma mensagem é disparada. Em seguida, reativar a chave. |

---

## 5. 👨‍💼 Painel Administrativo & Fila de Pedidos

| Status | ID | Cenário de Teste | O que observar |
| :---: | :---: | :--- | :--- |
| [ ] | TC-16 | **Acesso Master** | Logar com `yuranporto@gmail.com` e verificar a aparição do botão "Painel Admin" no cabeçalho. |
| [ ] | TC-17 | **Fila em Tempo Real (Apenas Novos Pedidos)** | Com o painel admin aberto, fazer um pedido em janela anônima e verificar se o pedido surge automaticamente na lista (Realtime filtrado estritamente por `INSERT`). |
| [ ] | TC-18 | **Mudança de Status Otimista Local** | Clicar em "Aceitar Pedido" ➔ "Mandar p/ Cozinha" ➔ "Despachar Entrega". A transição ocorre de forma imediata no estado local sem disparar refetch pesado no banco. |
| [ ] | TC-19 | **Filtros de Fila** | Filtrar por "Pendentes", "Confirmados", "Na Cozinha", "Em Rota", "Entregues" e "Todos". |

---

## 6. 🖼️ Otimização no Navegador & Cloudflare R2

| Status | ID | Cenário de Teste | O que observar |
| :---: | :---: | :--- | :--- |
| [ ] | TC-20 | **Interceptação de Foto Pesada** | No modal de novo/edição de prato, selecionar uma foto de alta resolução da câmera (> 4 MB a 6 MB). |
| [ ] | TC-21 | **Compressão em Milissegundos** | O script deve processar em background e exibir o badge verde: `Foto Otimizada no Navegador (.webp) - Reduzida de X MB para ~60-80 KB (-98%)`. |
| [ ] | TC-22 | **Prévia em WebP** | A miniatura quadrada da foto convertida em `.webp` deve aparecer na tela ao lado dos dados de compressão. |
| [ ] | TC-23 | **Persistência do Prato** | Clicar em "Salvar Prato" e verificar se a imagem salva carrega com nitidez e velocidade no catálogo público. |
| [ ] | TC-24 | **Upload de Logotipo e Favicon** | Na aba Configurações, enviar um novo Logo e conferir a otimização automática antes de salvar. |

---

## 7. 🔊 Notificações Sonoras Nativas (Web Audio API)

| Status | ID | Cenário de Teste | O que observar |
| :---: | :---: | :--- | :--- |
| [ ] | TC-25 | **Demonstração de Alerta Sonoro** | No topo do Painel Admin ou em Configurações, clicar no botão `"Testar Som"`. O navegador deve sintetizar instantaneamente a melodia de sino duplo sem carregar arquivos MP3 ou travar a tela. |
| [ ] | TC-26 | **Alerta Automático no Novo Pedido** | Com o Painel Admin aberto e o som ativo (`Som Ativo`), fazer um pedido em aba anônima. No momento da finalização do pedido, o painel deve tocar o sino melódico no alto-falante. |
| [ ] | TC-27 | **Silenciamento / Mudo** | Clicar em `"Som Ativo"` para alternar para `"Som Mudo"` (ou desligar a chave nas configurações). Fazer um novo pedido e constatar que a lista atualiza silenciosamente. |

---

## 📝 Registro de Ocorrências e Observações
*Espaço para anotações rápidas durante os testes manuais:*

- **Observação 1:** __________________________________________________
- **Observação 2:** __________________________________________________
- **Observação 3:** __________________________________________________

---

## ✅ Critério de Conclusão para Release
- [ ] 100% dos testes de Checkout e Pedidos (TC-01 a TC-09) aprovados;
- [ ] Realtime funcionando com avanço automático do stepper (TC-10 a TC-12);
- [ ] Notificação de WhatsApp do admin validada (TC-13 a TC-15);
- [ ] Otimização de imagens WebP validada (TC-20 a TC-24);
- [ ] Alerta sonoro Web Audio API validado (TC-25 a TC-27).
