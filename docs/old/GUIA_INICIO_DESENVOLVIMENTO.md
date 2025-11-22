# 🚀 Guia de Início - Desenvolvimento

## 📋 Objetivo

Este guia fornece os passos necessários para iniciar o desenvolvimento do projeto **Motor** (integração com Evolution API).

---

## 🎯 Arquitetura Atual

**Este Projeto (Motor):**
- Integração com Evolution API
- Gerenciamento de instâncias WhatsApp
- Recebimento e repasse de webhooks
- Persistência básica no Supabase

**Projeto Cérebro (Outro Projeto):**
- Processamento de IA (Groq AI)
- Lógica de bot
- Análise de intenção
- Geração de respostas automáticas

**⚠️ IMPORTANTE:** Este projeto NÃO deve conter lógica de IA. Sempre repasse eventos para o projeto cérebro.

---

## ✅ Checklist de Configuração Inicial

### 1. Configurar Ambiente Local

- [ ] Instalar Node.js (v18 ou superior)
- [ ] Instalar dependências: `npm install`
- [ ] Criar arquivo `.env.local` com variáveis de ambiente

### 2. Configurar Variáveis de Ambiente

Crie `.env.local` na raiz do projeto:

```env
# Evolution API
NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-secreta

# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Webhook
WEBHOOK_SECRET=sua-chave-secreta-webhook

# Projeto Cérebro (onde está a lógica de IA)
BRAIN_WEBHOOK_URL=https://seu-projeto-cerebro.com/api/webhook
BRAIN_WEBHOOK_SECRET=sua-chave-secreta
```

### 3. Configurar Supabase

- [ ] Criar projeto no Supabase
- [ ] Executar `SCRIPTS_SUPABASE.sql` no SQL Editor do Supabase
- [ ] Criar bucket de Storage chamado `products` (para imagens de produtos)
- [ ] Configurar políticas de acesso do Storage

### 4. Configurar Evolution API

- [ ] Instalar Docker (se ainda não tiver)
- [ ] Criar `docker-compose.yml` para Evolution API
- [ ] Configurar webhook URL para apontar para este projeto
- [ ] Configurar eventos: `messages.upsert`, `connection.update`, `qrcode.update`

### 5. Testar Configuração

- [ ] Iniciar servidor: `npm run dev`
- [ ] Testar conexão com Evolution API
- [ ] Testar webhook recebendo eventos
- [ ] Testar repasse de eventos para projeto cérebro

---

## 🏗️ Estrutura do Projeto

```
whatsapp-evolution-api/
├── app/
│   └── api/                    # API Routes
│       ├── webhook/            # Webhook da Evolution API
│       ├── instance/           # Gerenciar instâncias WhatsApp
│       ├── conversations/      # Gerenciar conversas
│       └── products/           # Gerenciar produtos
├── lib/
│   ├── evolution-api.ts        # Cliente Evolution API
│   ├── supabase.ts             # Cliente Supabase
│   └── services/
│       └── products.ts          # Serviço de produtos
├── types/
│   ├── index.ts                # Types principais
│   └── supabase.ts             # Types do Supabase
├── docs/                       # Documentação
└── SCRIPTS_SUPABASE.sql        # Scripts SQL do Supabase
```

---

## 📡 APIs Disponíveis

### Instâncias WhatsApp

- ✅ `POST /api/instance/connect` - Conectar instância e obter QR Code
- ✅ `DELETE /api/instance/disconnect` - Desconectar instância
- ✅ `GET /api/instance/status` - Obter status da instância

### Webhook

- ✅ `POST /api/webhook` - Recebe eventos da Evolution API e repassa para projeto cérebro

### Conversas

- ✅ `GET /api/conversations` - Listar conversas
- ✅ `GET /api/conversations/:id` - Obter conversa por ID
- ✅ `POST /api/conversations/:id/messages` - Enviar mensagem
- ✅ `PUT /api/conversations/:id/takeover` - Assumir conversa
- ✅ `PUT /api/conversations/:id/resolve` - Resolver conversa

### Produtos

- ✅ `GET /api/products` - Listar produtos
- ✅ `POST /api/products` - Criar produto
- ✅ `PUT /api/products/:id` - Atualizar produto
- ✅ `DELETE /api/products/:id` - Deletar produto
- ✅ `POST /api/products/upload-image` - Upload de imagem

---

## 🔄 Fluxos Principais

### 1. Conectar WhatsApp

```
1. Frontend → POST /api/instance/connect
2. Este Projeto → Evolution API (createInstance)
3. Evolution API → Retorna QR Code
4. Este Projeto → Salva no Supabase
5. Frontend → Exibe QR Code
6. Usuário escaneia → Evolution API conecta
7. Evolution API → Webhook (connection.update) → Este Projeto
8. Este Projeto → Atualiza status no Supabase
9. Este Projeto → Repassa evento para Projeto Cérebro
```

### 2. Mensagem Recebida

```
1. Cliente envia mensagem no WhatsApp
2. Evolution API recebe
3. Evolution API → Webhook (messages.upsert) → Este Projeto
4. Este Projeto:
   - Salva mensagem no Supabase
   - Atualiza conversa
   - Repassa evento para Projeto Cérebro
5. Projeto Cérebro:
   - Processa com Groq AI
   - Gera resposta
   - Chama Este Projeto → POST /api/conversations/:id/messages
6. Este Projeto → Evolution API (sendTextMessage)
7. Mensagem enviada via WhatsApp
```

### 3. Mensagem Enviada pelo Atendente

```
1. Atendente digita mensagem no frontend
2. Frontend → POST /api/conversations/:id/messages
3. Este Projeto:
   - Valida autenticação
   - Chama Evolution API (sendTextMessage)
   - Salva mensagem no Supabase
4. Evolution API envia mensagem via WhatsApp
```

---

## 🛠️ Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Lint
npm run lint
```

---

## 🔌 Integração com Projeto Cérebro

### Como o Motor Repassa Eventos

O motor repassa todos os eventos recebidos da Evolution API para o projeto cérebro através de `BRAIN_WEBHOOK_URL`.

**Formato do evento repassado:**

```json
{
  "event": "messages.upsert" | "connection.update" | "qrcode.update",
  "data": {
    "instanceName": "instance-123",
    "messages": [...],
    "state": "open" | "close" | "connecting",
    "qrcode": {...}
  }
}
```

### Como o Cérebro Envia Mensagens

O projeto cérebro deve chamar as APIs do motor para enviar mensagens:

```typescript
// POST /api/conversations/:id/messages
{
  "text": "Mensagem gerada pela IA"
}
```

---

## ⚠️ Regras Importantes

### ❌ NUNCA Fazer no Motor

- Adicionar lógica de IA (Groq AI)
- Processar mensagens com IA
- Analisar intenção
- Gerar respostas automáticas
- Decidir transbordo baseado em IA

### ✅ SEMPRE Fazer no Motor

- Integrar com Evolution API
- Gerenciar instâncias WhatsApp
- Receber webhooks da Evolution API
- Repassar eventos para projeto cérebro
- Salvar dados básicos no Supabase
- Enviar mensagens via Evolution API

---

## 🐛 Troubleshooting

### Erro: "Evolution API não responde"

- Verificar se Evolution API está rodando (Docker)
- Verificar `NEXT_PUBLIC_EVOLUTION_API_URL` no `.env.local`
- Verificar `EVOLUTION_API_KEY` no `.env.local`

### Erro: "Supabase não conecta"

- Verificar variáveis de ambiente do Supabase
- Verificar se tabelas foram criadas (`SCRIPTS_SUPABASE.sql`)
- Verificar RLS (Row Level Security) configurado

### Erro: "Webhook não recebe eventos"

- Verificar se Evolution API está configurada para enviar webhooks
- Verificar `WEBHOOK_URL` na Evolution API
- Verificar se o servidor está acessível (túnel ngrok se necessário)

### Erro: "Projeto cérebro não recebe eventos"

- Verificar `BRAIN_WEBHOOK_URL` no `.env.local`
- Verificar se projeto cérebro está rodando
- Verificar `BRAIN_WEBHOOK_SECRET` (se necessário)

---

## 📚 Documentação Relacionada

- `docs/ARQUITETURA_ATUAL.md` - **LEIA PRIMEIRO** - Arquitetura atual (motor vs cérebro)
- `docs/ARQUITETURA_BACKEND.md` - Arquitetura completa (pode estar desatualizada)
- `docs/ESPECIFICACAO_TECNICA_BACKEND.md` - Especificação técnica
- `docs/GUIA_RAPIDO_BACKEND.md` - Guia rápido
- `docs/RESUMO_BACKEND.md` - Resumo executivo
- `README.md` - Documentação principal

---

## 🚀 Próximos Passos

1. **Configurar ambiente local** (variáveis de ambiente, Supabase, Evolution API)
2. **Testar conexão** com Evolution API
3. **Testar webhook** recebendo eventos
4. **Testar repasse** de eventos para projeto cérebro
5. **Implementar funcionalidades** conforme necessário

---

**Última atualização:** 2024
**Versão:** 1.0

