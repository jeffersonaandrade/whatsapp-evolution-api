# 🔧 Especificação Técnica - Backend WhatsApp SaaS

## 📋 Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Arquitetura de Integração](#arquitetura-de-integração)
3. [Endpoints da Evolution API](#endpoints-da-evolution-api)
4. [Endpoints do Backend](#endpoints-do-backend)
5. [Fluxos de Integração](#fluxos-de-integração)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [Implementação Passo a Passo](#implementação-passo-a-passo)

---

## 📊 Resumo Executivo

### Objetivo

Integrar o frontend Next.js com a Evolution API para criar um SaaS completo de atendimento via WhatsApp, incluindo:

- ✅ Conexão de instâncias WhatsApp via QR Code
- ✅ Recebimento e envio de mensagens
- ✅ Bot inteligente com Groq AI
- ✅ Sistema de transbordo (bot → humano)
- ✅ Gerenciamento de conversas
- ✅ Campanhas em grupos
- ✅ Multi-tenancy (múltiplas contas)

### Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Backend**: Next.js API Routes (serverless) ou Backend dedicado
- **Evolution API**: Docker container (servidor dedicado)
- **Banco de Dados**: Supabase (PostgreSQL)
- **IA**: Groq AI (processamento de mensagens)

---

## 🏗️ Arquitetura de Integração

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  - Dashboard, Conversations, Campaigns, Groups              │
│  - Autenticação via Supabase Auth                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Next.js API Routes)                    │
│  - /api/instance/* (gerenciar instâncias)                    │
│  - /api/conversations/* (gerenciar conversas)                │
│  - /api/webhook (recebe eventos da Evolution API)             │
│  - /api/products/* (gerenciar produtos)                       │
│  - /api/campaigns/* (gerenciar campanhas)                     │
│  - /api/groups/* (gerenciar grupos)                           │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │ HTTP/HTTPS                   │ Webhook
         │                              │
┌────────────────────────┐   ┌─────────────────────────────┐
│   EVOLUTION API        │   │      GROQ AI                │
│   (Docker Container)   │   │   (Processamento IA)        │
│                        │   │                             │
│  - Gerencia WhatsApp   │   │  - Analisa intenção         │
│  - Envia/recebe msgs   │   │  - Gera respostas           │
│  - Gerencia instâncias │   │  - Detecta compra           │
└────────────────────────┘   └─────────────────────────────┘
         │
         │ Webhook
         │
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                    │
│  - Usuários e autenticação                                   │
│  - Instâncias WhatsApp                                       │
│  - Conversas e mensagens                                     │
│  - Produtos                                                  │
│  - Campanhas                                                 │
│  - Grupos                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principais

1. **Frontend (Next.js)**: Interface do usuário
2. **Backend (Next.js API Routes)**: Lógica de negócio e integrações
3. **Evolution API**: Comunicação com WhatsApp
4. **Supabase**: Banco de dados e autenticação
5. **Groq AI**: Processamento de IA

---

## 🔌 Endpoints da Evolution API

### Base URL

```
Base URL: process.env.NEXT_PUBLIC_EVOLUTION_API_URL
Headers: {
  'Content-Type': 'application/json',
  'apikey': process.env.EVOLUTION_API_KEY
}
```

### Endpoints Utilizados

#### 1. Criar Instância

```http
POST /instance/create
Content-Type: application/json
apikey: {API_KEY}

Body:
{
  "instanceName": "instance-123",
  "qrcode": true
}

Response:
{
  "instance": {
    "instanceName": "instance-123",
    "status": "created"
  },
  "qrcode": {
    "base64": "data:image/png;base64,...",
    "code": "qr-code-string"
  }
}
```

#### 2. Conectar Instância (Obter QR Code)

```http
GET /instance/connect/{instanceName}
apikey: {API_KEY}

Response:
{
  "qrcode": {
    "base64": "data:image/png;base64,...",
    "code": "qr-code-string"
  }
}
```

#### 3. Status da Conexão

```http
GET /instance/connectionState/{instanceName}
apikey: {API_KEY}

Response:
{
  "state": "open" | "close" | "connecting"
}
```

#### 4. Enviar Mensagem de Texto

```http
POST /message/sendText/{instanceName}
Content-Type: application/json
apikey: {API_KEY}

Body:
{
  "number": "5511999999999@s.whatsapp.net",
  "text": "Olá! Como posso ajudar?"
}

Response:
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "id": "msg-id"
  },
  "message": {
    "conversation": "Olá! Como posso ajudar?"
  }
}
```

#### 5. Enviar Mídia

```http
POST /message/sendMedia/{instanceName}
Content-Type: application/json
apikey: {API_KEY}

Body:
{
  "number": "5511999999999@s.whatsapp.net",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Descrição da imagem"
}

Response:
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "id": "msg-id"
  }
}
```

#### 6. Listar Grupos

```http
GET /group/fetchAllGroups/{instanceName}
apikey: {API_KEY}

Response:
{
  "groups": [
    {
      "id": "group-id",
      "subject": "Nome do Grupo",
      "participants": ["5511999999999@s.whatsapp.net"]
    }
  ]
}
```

#### 7. Enviar Mensagem para Grupo

```http
POST /message/sendText/{instanceName}
Content-Type: application/json
apikey: {API_KEY}

Body:
{
  "number": "group-id@s.whatsapp.net",
  "text": "Mensagem para o grupo"
}

Response:
{
  "key": {
    "remoteJid": "group-id@s.whatsapp.net",
    "id": "msg-id"
  }
}
```

#### 8. Desconectar Instância

```http
DELETE /instance/logout/{instanceName}
apikey: {API_KEY}

Response:
{
  "message": "Instance logged out"
}
```

#### 9. Deletar Instância

```http
DELETE /instance/delete/{instanceName}
apikey: {API_KEY}

Response:
{
  "message": "Instance deleted"
}
```

### Webhook da Evolution API

A Evolution API envia webhooks para o backend quando eventos ocorrem:

```http
POST {WEBHOOK_URL}/api/webhook
Content-Type: application/json

Body:
{
  "event": "messages.upsert" | "connection.update" | "qrcode.update",
  "data": { ... }
}
```

---

## 🛠️ Endpoints do Backend

### Base URL

```
Base URL: https://seu-dominio.vercel.app/api
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {JWT_TOKEN}'
}
```

### 1. Instâncias WhatsApp

#### Conectar Instância

```http
POST /api/instance/connect
Authorization: Bearer {JWT_TOKEN}

Body:
{
  "instanceName": "instance-123"
}

Response:
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "instanceName": "instance-123"
}
```

#### Desconectar Instância

```http
DELETE /api/instance/disconnect
Authorization: Bearer {JWT_TOKEN}

Body:
{
  "instanceName": "instance-123"
}

Response:
{
  "success": true
}
```

#### Status da Instância

```http
GET /api/instance/status?instanceName=instance-123
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "status": "connected" | "disconnected" | "connecting",
  "phoneNumber": "5511999999999",
  "profilePicUrl": "https://..."
}
```

### 2. Webhook (Evolution API → Backend)

```http
POST /api/webhook

Body:
{
  "event": "messages.upsert",
  "data": {
    "instanceName": "instance-123",
    "messages": [...]
  }
}

Response:
{
  "success": true
}
```

**Implementação:** Ver `app/api/webhook/route.ts` (já implementado)

### 3. Conversas

#### Listar Conversas

```http
GET /api/conversations?instanceId={id}&status={status}
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "conversations": [
    {
      "id": "conv-id",
      "contact": {
        "id": "contact-id",
        "phoneNumber": "5511999999999",
        "name": "João Silva"
      },
      "status": "bot" | "waiting_agent" | "in_service" | "resolved",
      "lastMessageAt": "2024-01-01T10:00:00Z",
      "lastMessage": "Última mensagem..."
    }
  ]
}
```

#### Obter Conversa

```http
GET /api/conversations/{id}
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "id": "conv-id",
  "contact": { ... },
  "messages": [
    {
      "id": "msg-id",
      "fromMe": true,
      "body": "Olá!",
      "timestamp": "2024-01-01T10:00:00Z",
      "status": "read",
      "sentBy": "bot"
    }
  ]
}
```

#### Enviar Mensagem

```http
POST /api/conversations/{id}/messages
Authorization: Bearer {JWT_TOKEN}

Body:
{
  "text": "Mensagem do atendente"
}

Response:
{
  "success": true,
  "message": {
    "id": "msg-id",
    "fromMe": true,
    "body": "Mensagem do atendente",
    "timestamp": "2024-01-01T10:00:00Z",
    "status": "sent",
    "sentBy": "agent"
  }
}
```

#### Assumir Conversa (Takeover)

```http
PUT /api/conversations/{id}/takeover
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "conversation": {
    "id": "conv-id",
    "status": "in_service",
    "assignedTo": "user-id"
  }
}
```

#### Resolver Conversa

```http
PUT /api/conversations/{id}/resolve
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "conversation": {
    "id": "conv-id",
    "status": "resolved"
  }
}
```

### 4. Produtos

#### Listar Produtos

```http
GET /api/products
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "products": [
    {
      "id": "prod-id",
      "name": "Produto 1",
      "description": "Descrição",
      "price": 99.90,
      "imageUrl": "https://..."
    }
  ]
}
```

#### Criar Produto

```http
POST /api/products
Authorization: Bearer {JWT_TOKEN}

Body:
{
  "name": "Produto 1",
  "description": "Descrição",
  "price": 99.90,
  "imageUrl": "https://..."
}

Response:
{
  "id": "prod-id",
  "name": "Produto 1",
  ...
}
```

#### Upload de Imagem

```http
POST /api/products/upload-image
Authorization: Bearer {JWT_TOKEN}
Content-Type: multipart/form-data

Body: FormData (file)

Response:
{
  "url": "https://storage.supabase.co/..."
}
```

### 5. Campanhas

#### Listar Campanhas

```http
GET /api/campaigns
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "campaigns": [
    {
      "id": "camp-id",
      "name": "Campanha 1",
      "message": "Mensagem",
      "targetGroups": ["group-id-1", "group-id-2"],
      "status": "draft" | "scheduled" | "sent" | "failed",
      "scheduledFor": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### Criar Campanha

```http
POST /api/campaigns
Authorization: Bearer {JWT_TOKEN}

Body:
{
  "name": "Campanha 1",
  "message": "Mensagem",
  "targetGroups": ["group-id-1"],
  "scheduledFor": "2024-01-01T10:00:00Z" // Opcional
}

Response:
{
  "id": "camp-id",
  ...
}
```

### 6. Grupos

#### Listar Grupos

```http
GET /api/groups
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "groups": [
    {
      "id": "group-id",
      "groupId": "whatsapp-group-id",
      "name": "Grupo 1",
      "autoSubscribe": true,
      "keywords": ["PROMOÇÕES", "SIM"]
    }
  ]
}
```

---

## 🔄 Fluxos de Integração

### Fluxo 1: Conectar WhatsApp

```
1. Usuário clica "Conectar WhatsApp"
   ↓
2. Frontend: POST /api/instance/connect
   ↓
3. Backend:
   a. Valida autenticação
   b. Busca account_id do usuário
   c. Chama evolutionAPI.createInstance()
   d. Salva instância no Supabase
   e. Retorna QR Code
   ↓
4. Frontend exibe QR Code
   ↓
5. Usuário escaneia QR Code
   ↓
6. Evolution API envia webhook: connection.update
   ↓
7. Webhook atualiza status no Supabase
   ↓
8. Frontend atualiza status (polling ou WebSocket)
```

### Fluxo 2: Mensagem Recebida

```
1. Cliente envia mensagem no WhatsApp
   ↓
2. Evolution API recebe mensagem
   ↓
3. Evolution API envia webhook: messages.upsert
   ↓
4. Webhook processa:
   a. Busca ou cria conversa no Supabase
   b. Salva mensagem recebida
   c. Verifica se conversa está com atendente
   d. Se não, processa com Groq AI:
      - Analisa intenção
      - Gera resposta
      - Verifica se deve transferir
   e. Envia resposta via Evolution API
   f. Salva mensagem enviada no Supabase
   ↓
5. Frontend atualiza conversas (polling ou WebSocket)
```

### Fluxo 3: Atendente Envia Mensagem

```
1. Atendente digita mensagem no frontend
   ↓
2. Frontend: POST /api/conversations/{id}/messages
   ↓
3. Backend:
   a. Valida autenticação e permissões
   b. Busca conversa e instância
   c. Chama evolutionAPI.sendTextMessage()
   d. Salva mensagem no Supabase
   ↓
4. Evolution API envia mensagem via WhatsApp
   ↓
5. Frontend atualiza UI
```

### Fluxo 4: Transbordo (Bot → Humano)

```
1. Cliente envia mensagem
   ↓
2. Webhook processa com Groq AI
   ↓
3. IA detecta intenção de compra ou palavra-chave
   ↓
4. Webhook:
   a. Atualiza conversation.status = 'waiting_agent'
   b. Envia mensagem de transferência
   c. Para de processar mensagens dessa conversa
   ↓
5. Atendente vê conversa na fila
   ↓
6. Atendente clica "Assumir"
   ↓
7. Frontend: PUT /api/conversations/{id}/takeover
   ↓
8. Backend atualiza status para 'in_service'
   ↓
9. Próximas mensagens não são processadas pelo bot
```

---

## 📊 Estrutura de Dados

### Tabelas Principais

Ver documentação completa em `docs/ARQUITETURA_BACKEND.md` seção "Banco de Dados".

### Relacionamentos

```
accounts (1) ──→ (N) instances
accounts (1) ──→ (N) contacts
accounts (1) ──→ (N) products

instances (1) ──→ (N) conversations
instances (1) ──→ (N) groups
instances (1) ──→ (N) campaigns

contacts (1) ──→ (N) conversations

conversations (1) ──→ (N) messages
```

---

## 🚀 Implementação Passo a Passo

### Fase 1: Configuração Inicial

1. **Configurar Evolution API**
   ```bash
   # docker-compose.yml
   services:
     evolution-api:
       environment:
         WEBHOOK_URL: https://seu-dominio.vercel.app/api/webhook
         WEBHOOK_EVENTS: messages.upsert,connection.update,qrcode.update
         API_KEY: sua-chave-secreta
   ```

2. **Configurar Variáveis de Ambiente**
   ```env
   # .env.local
   NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
   EVOLUTION_API_KEY=sua-chave-secreta
   NEXT_PUBLIC_SUPABASE_URL=sua-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave
   GROQ_API_KEY=sua-chave-groq
   ```

3. **Testar Conexão com Evolution API**
   ```typescript
   // Teste simples
   const result = await evolutionAPI.getInstanceStatus('test-instance');
   console.log(result);
   ```

### Fase 2: Integração Supabase

1. **Criar Tabelas**
   - Executar scripts SQL no Supabase
   - Ver `SCRIPTS_SUPABASE.sql` na raiz do projeto

2. **Configurar RLS**
   - Habilitar Row Level Security
   - Criar políticas de acesso

3. **Substituir Mocks**
   - Substituir `mockDataService` por chamadas reais ao Supabase
   - Ver `app/api/webhook/route.ts` para TODOs

### Fase 3: Implementar APIs

1. **Instâncias**
   - `/api/instance/connect` ✅ (já implementado)
   - `/api/instance/disconnect` ✅ (já implementado)
   - `/api/instance/status` ✅ (já implementado)

2. **Conversas**
   - `/api/conversations` ✅ (já implementado)
   - `/api/conversations/:id` ✅ (já implementado)
   - `/api/conversations/:id/messages` ✅ (já implementado)
   - `/api/conversations/:id/takeover` ✅ (já implementado)
   - `/api/conversations/:id/resolve` ✅ (já implementado)

3. **Produtos**
   - `/api/products` ✅ (já implementado)
   - `/api/products/upload-image` ✅ (já implementado)

4. **Campanhas**
   - `/api/campaigns` ⏳

5. **Grupos**
   - `/api/groups` ⏳

### Fase 4: Webhook

1. **Validação de Webhook**
   - Validar origem dos webhooks
   - Verificar API key

2. **Processamento de Eventos**
   - `messages.upsert` ✅ (já implementado)
   - `connection.update` ✅ (já implementado)
   - `qrcode.update` ✅ (já implementado)

3. **Integração com Supabase**
   - Salvar mensagens no Supabase
   - Atualizar status de conversas
   - Buscar configurações do negócio

### Fase 5: Testes

1. **Testar Conexão WhatsApp**
   - Criar instância
   - Escanear QR Code
   - Verificar status

2. **Testar Mensagens**
   - Enviar mensagem do WhatsApp
   - Verificar webhook
   - Verificar resposta do bot

3. **Testar Transbordo**
   - Enviar palavra-chave
   - Verificar transferência
   - Testar atendimento humano

---

## 📝 Notas Importantes

### Rate Limiting

- **Groq AI**: 200K TPM / 200 RPM (já implementado)
- **WhatsApp**: Limitar mensagens por instância
- **API Routes**: Implementar rate limiting por usuário

### Segurança

- Validar origem dos webhooks
- Usar API keys para Evolution API
- Implementar RLS no Supabase
- Validar autenticação em todas as rotas

### Performance

- Usar cache para configurações do negócio
- Implementar fila para mensagens (se necessário)
- Otimizar queries ao Supabase
- Considerar WebSocket para atualizações em tempo real

---

**Última atualização:** 2024
**Versão:** 1.0

