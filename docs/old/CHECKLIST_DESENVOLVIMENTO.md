# ✅ Checklist de Desenvolvimento

## 📋 Checklist Inicial

### Configuração do Ambiente

- [ ] Node.js instalado (v18+)
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env.local` criado
- [ ] Variáveis de ambiente configuradas

### Configuração do Supabase

- [ ] Projeto criado no Supabase
- [ ] Scripts SQL executados (`SCRIPTS_SUPABASE.sql`)
- [ ] Bucket de Storage `products` criado
- [ ] Políticas de acesso do Storage configuradas
- [ ] RLS (Row Level Security) configurado

### Configuração da Evolution API

- [ ] Docker instalado
- [ ] Evolution API rodando (Docker)
- [ ] Webhook URL configurada na Evolution API
- [ ] Eventos configurados: `messages.upsert`, `connection.update`, `qrcode.update`
- [ ] API Key configurada

### Configuração do Projeto Cérebro

- [ ] Projeto cérebro configurado
- [ ] `BRAIN_WEBHOOK_URL` configurado no `.env.local`
- [ ] `BRAIN_WEBHOOK_SECRET` configurado (se necessário)
- [ ] Projeto cérebro rodando e acessível

### Testes Iniciais

- [ ] Servidor Next.js inicia sem erros (`npm run dev`)
- [ ] Conexão com Evolution API funciona
- [ ] Conexão com Supabase funciona
- [ ] Webhook recebe eventos da Evolution API
- [ ] Webhook repassa eventos para projeto cérebro

---

## 🔧 Funcionalidades Implementadas

### Instâncias WhatsApp

- [x] `POST /api/instance/connect` - Conectar instância
- [x] `DELETE /api/instance/disconnect` - Desconectar instância
- [x] `GET /api/instance/status` - Status da instância

### Webhook

- [x] `POST /api/webhook` - Recebe eventos da Evolution API
- [x] Processa evento `messages.upsert`
- [x] Processa evento `connection.update`
- [x] Processa evento `qrcode.update`
- [x] Repassa eventos para projeto cérebro

### Conversas

- [x] `GET /api/conversations` - Listar conversas
- [x] `GET /api/conversations/:id` - Obter conversa
- [x] `POST /api/conversations/:id/messages` - Enviar mensagem
- [x] `PUT /api/conversations/:id/takeover` - Assumir conversa
- [x] `PUT /api/conversations/:id/resolve` - Resolver conversa

### Produtos

- [x] `GET /api/products` - Listar produtos
- [x] `POST /api/products` - Criar produto
- [x] `PUT /api/products/:id` - Atualizar produto
- [x] `DELETE /api/products/:id` - Deletar produto
- [x] `POST /api/products/upload-image` - Upload de imagem

### Funcionalidades Pendentes

- [ ] `GET /api/campaigns` - Listar campanhas
- [ ] `POST /api/campaigns` - Criar campanha
- [ ] `PUT /api/campaigns/:id` - Atualizar campanha
- [ ] `DELETE /api/campaigns/:id` - Deletar campanha
- [ ] `GET /api/groups` - Listar grupos
- [ ] `POST /api/groups` - Criar grupo
- [ ] `PUT /api/groups/:id` - Atualizar grupo

---

## 🧪 Testes

### Testes de Integração

- [ ] Testar conexão WhatsApp (QR Code)
- [ ] Testar recebimento de mensagem
- [ ] Testar repasse de evento para projeto cérebro
- [ ] Testar envio de mensagem via API
- [ ] Testar atualização de status de conexão

### Testes de API

- [ ] Testar todas as rotas de instâncias
- [ ] Testar todas as rotas de conversas
- [ ] Testar todas as rotas de produtos
- [ ] Testar autenticação em todas as rotas
- [ ] Testar validação de permissões

### Testes de Webhook

- [ ] Testar recebimento de `messages.upsert`
- [ ] Testar recebimento de `connection.update`
- [ ] Testar recebimento de `qrcode.update`
- [ ] Testar repasse para projeto cérebro
- [ ] Testar tratamento de erros

---

## 🔐 Segurança

- [ ] Autenticação implementada em todas as rotas
- [ ] Validação de permissões (mesma conta)
- [ ] RLS (Row Level Security) configurado no Supabase
- [ ] Validação de webhook (WEBHOOK_SECRET)
- [ ] Validação ao repassar para projeto cérebro (BRAIN_WEBHOOK_SECRET)
- [ ] Variáveis de ambiente não expostas no código

---

## 📝 Documentação

- [x] `README.md` atualizado
- [x] `docs/ARQUITETURA_ATUAL.md` criado
- [x] `docs/GUIA_INICIO_DESENVOLVIMENTO.md` criado
- [x] `docs/CHECKLIST_DESENVOLVIMENTO.md` criado
- [ ] Documentação de APIs atualizada
- [ ] Exemplos de uso documentados

---

## 🚀 Deploy

- [ ] Variáveis de ambiente configuradas no ambiente de produção
- [ ] Evolution API configurada para produção
- [ ] Supabase configurado para produção
- [ ] Projeto cérebro configurado para produção
- [ ] Webhook URL atualizada na Evolution API
- [ ] `BRAIN_WEBHOOK_URL` atualizado para produção
- [ ] Testes em produção realizados

---

## ⚠️ Pontos de Atenção

### Antes de Fazer Mudanças

- [ ] Ler `docs/ARQUITETURA_ATUAL.md` para entender a arquitetura
- [ ] Verificar se a mudança não quebra a separação motor/cérebro
- [ ] Verificar se não está adicionando lógica de IA no motor
- [ ] Verificar se não está fazendo o cérebro acessar Evolution API diretamente

### Ao Adicionar Novas Funcionalidades

- [ ] Verificar se pertence ao motor ou ao cérebro
- [ ] Se for motor: implementar aqui
- [ ] Se for cérebro: não implementar aqui
- [ ] Atualizar documentação se necessário

### Ao Modificar Webhooks

- [ ] Verificar se projeto cérebro precisa ser atualizado
- [ ] Verificar se estrutura de dados mudou
- [ ] Testar repasse de eventos após mudança

---

**Última atualização:** 2024
**Versão:** 1.0

