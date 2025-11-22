# 🏗️ Arquitetura Atual - Motor vs Cérebro

## 📋 Visão Geral

Este documento descreve a arquitetura atual do sistema, dividida em dois projetos:

1. **Este Projeto (Motor)** - Integração com Evolution API
2. **Projeto Cérebro** - Lógica de IA e processamento de mensagens

---

## 🎯 Divisão de Responsabilidades

### Este Projeto (Motor) - `whatsapp-evolution-api`

**Responsabilidades:**
- ✅ Integração com Evolution API
- ✅ Gerenciamento de instâncias WhatsApp
- ✅ Recebimento de webhooks da Evolution API
- ✅ Repasse de eventos para o projeto cérebro
- ✅ Persistência básica no Supabase (instâncias, contatos, conversas, mensagens)
- ✅ APIs para gerenciar instâncias, conversas e produtos
- ✅ Envio de mensagens via Evolution API

**NÃO faz:**
- ❌ Processamento de IA (Groq AI)
- ❌ Lógica de bot
- ❌ Análise de intenção
- ❌ Geração de respostas automáticas
- ❌ Decisões de transbordo

### Projeto Cérebro

**Responsabilidades:**
- ✅ Processamento de mensagens com Groq AI
- ✅ Análise de intenção
- ✅ Geração de respostas automáticas
- ✅ Lógica de bot
- ✅ Decisões de transbordo (bot → humano)
- ✅ Configuração de negócio
- ✅ Lógica de negócio complexa

**NÃO faz:**
- ❌ Integração direta com Evolution API
- ❌ Gerenciamento de instâncias WhatsApp

---

## 🔄 Fluxo de Comunicação

### 1. Fluxo de Mensagem Recebida

```
Cliente envia mensagem no WhatsApp
    ↓
Evolution API recebe mensagem
    ↓
Evolution API → Webhook → Este Projeto (Motor)
    ↓
Este Projeto:
  - Salva mensagem no Supabase
  - Atualiza conversa
  - Repassa evento para Projeto Cérebro (BRAIN_WEBHOOK_URL)
    ↓
Projeto Cérebro:
  - Processa mensagem com Groq AI
  - Analisa intenção
  - Gera resposta
  - Decide se deve transferir
    ↓
Projeto Cérebro → Este Projeto (Motor) → Evolution API
    ↓
Mensagem enviada via WhatsApp
```

### 2. Fluxo de Conexão WhatsApp

```
Usuário clica "Conectar WhatsApp"
    ↓
Frontend → Este Projeto (Motor) → POST /api/instance/connect
    ↓
Este Projeto:
  - Chama Evolution API (createInstance)
  - Salva instância no Supabase
  - Retorna QR Code
    ↓
Frontend exibe QR Code
    ↓
Usuário escaneia QR Code
    ↓
Evolution API conecta
    ↓
Evolution API → Webhook (connection.update) → Este Projeto
    ↓
Este Projeto:
  - Atualiza status no Supabase
  - Repassa evento para Projeto Cérebro (opcional)
```

### 3. Fluxo de Mensagem Enviada pelo Atendente

```
Atendente digita mensagem no frontend
    ↓
Frontend → Este Projeto (Motor) → POST /api/conversations/:id/messages
    ↓
Este Projeto:
  - Valida autenticação
  - Chama Evolution API (sendTextMessage)
  - Salva mensagem no Supabase
    ↓
Evolution API envia mensagem via WhatsApp
```

---

## 📡 APIs Disponíveis

### Este Projeto (Motor)

#### Instâncias WhatsApp
- `POST /api/instance/connect` - Conectar instância e obter QR Code
- `DELETE /api/instance/disconnect` - Desconectar instância
- `GET /api/instance/status` - Obter status da instância

#### Webhook
- `POST /api/webhook` - Recebe eventos da Evolution API e repassa para projeto cérebro

#### Conversas
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/:id` - Obter conversa por ID
- `POST /api/conversations/:id/messages` - Enviar mensagem
- `PUT /api/conversations/:id/takeover` - Assumir conversa
- `PUT /api/conversations/:id/resolve` - Resolver conversa

#### Produtos
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto
- `POST /api/products/upload-image` - Upload de imagem

### Projeto Cérebro (Esperado)

O projeto cérebro deve implementar:

- `POST /api/webhook` - Recebe eventos repassados do motor
- `POST /api/messages/send` - Envia mensagem via motor
- Outras APIs conforme necessário

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas Utilizadas

Este projeto utiliza as seguintes tabelas no Supabase:

- **accounts** - Contas (multi-tenancy)
- **users** - Usuários (Supabase Auth)
- **instances** - Instâncias WhatsApp
- **contacts** - Contatos
- **conversations** - Conversas
- **messages** - Mensagens
- **products** - Produtos
- **groups** - Grupos WhatsApp
- **campaigns** - Campanhas

### Persistência

Este projeto (motor) é responsável por:
- Salvar instâncias WhatsApp
- Salvar contatos
- Salvar conversas
- Salvar mensagens recebidas e enviadas
- Atualizar status de conexão

O projeto cérebro pode ler essas tabelas, mas não deve modificá-las diretamente (exceto através das APIs do motor).

---

## 🔌 Integração entre Projetos

### Variáveis de Ambiente

#### Este Projeto (Motor)

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

# Projeto Cérebro
BRAIN_WEBHOOK_URL=https://seu-projeto-cerebro.com/api/webhook
BRAIN_WEBHOOK_SECRET=sua-chave-secreta
```

#### Projeto Cérebro (Esperado)

```env
# URL do Motor
MOTOR_API_URL=https://seu-projeto-motor.com/api

# Supabase (mesmo banco)
NEXT_PUBLIC_SUPABASE_URL=sua-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Groq AI
GROQ_API_KEY=sua-chave-groq
```

### Comunicação

#### Motor → Cérebro

O motor repassa eventos da Evolution API para o cérebro via `BRAIN_WEBHOOK_URL`:

```typescript
// Evento repassado
{
  "event": "messages.upsert" | "connection.update" | "qrcode.update",
  "data": { ... }
}
```

#### Cérebro → Motor

O cérebro envia mensagens através das APIs do motor:

```typescript
// POST /api/conversations/:id/messages
{
  "text": "Mensagem gerada pela IA"
}
```

---

## 📁 Estrutura do Projeto (Motor)

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
│       └── products.ts         # Serviço de produtos
├── types/
│   ├── index.ts                # Types principais
│   └── supabase.ts             # Types do Supabase
├── docs/                       # Documentação
├── SCRIPTS_SUPABASE.sql        # Scripts SQL do Supabase
└── package.json
```

---

## ⚠️ Pontos de Atenção

### 1. Separação de Responsabilidades

**NUNCA adicionar ao motor:**
- Lógica de IA (Groq AI)
- Processamento de mensagens com IA
- Análise de intenção
- Geração automática de respostas
- Lógica de bot complexa

**SEMPRE manter no motor:**
- Integração com Evolution API
- Gerenciamento de instâncias
- Persistência básica
- Repasse de eventos

### 2. Comunicação entre Projetos

- O motor sempre repassa eventos para o cérebro
- O cérebro sempre usa as APIs do motor para enviar mensagens
- Ambos compartilham o mesmo banco Supabase
- O motor é a única fonte de verdade para instâncias WhatsApp

### 3. Mudanças que Quebram a Arquitetura

**⚠️ CUIDADO ao:**
- Adicionar lógica de IA no motor
- Fazer o cérebro acessar Evolution API diretamente
- Modificar estrutura de webhooks sem atualizar o cérebro
- Mudar estrutura do banco sem comunicar ambos projetos

---

## 🚀 Iniciando Desenvolvimento

### Checklist Inicial

- [ ] Configurar Evolution API (Docker)
- [ ] Configurar variáveis de ambiente
- [ ] Executar scripts SQL no Supabase
- [ ] Configurar `BRAIN_WEBHOOK_URL` (URL do projeto cérebro)
- [ ] Testar conexão com Evolution API
- [ ] Testar webhook recebendo eventos
- [ ] Testar repasse de eventos para projeto cérebro

### Próximos Passos

1. **Configurar Evolution API**
   - Docker container rodando
   - Webhook configurado para este projeto

2. **Configurar Supabase**
   - Executar `SCRIPTS_SUPABASE.sql`
   - Configurar RLS (Row Level Security)

3. **Testar Integração**
   - Conectar instância WhatsApp
   - Receber mensagem
   - Verificar repasse para projeto cérebro

---

## 📚 Documentação Relacionada

- `docs/ARQUITETURA_BACKEND.md` - Arquitetura completa (pode estar desatualizada)
- `docs/ESPECIFICACAO_TECNICA_BACKEND.md` - Especificação técnica
- `docs/GUIA_RAPIDO_BACKEND.md` - Guia rápido
- `docs/RESUMO_BACKEND.md` - Resumo executivo
- `README.md` - Documentação principal

---

**Última atualização:** 2024
**Versão:** 1.0

