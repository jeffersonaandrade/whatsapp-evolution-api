# WhatsApp Evolution API - Motor (Backend)

Este projeto é o **motor** do sistema - responsável pela integração com a Evolution API para gerenciamento de WhatsApp. O **cérebro** (Groq AI, lógica de bot, processamento de mensagens) está em outro projeto.

## 🎯 Objetivo

Este projeto atua como uma camada de integração com a Evolution API, recebendo webhooks e repassando eventos para o projeto "cérebro" que processa as mensagens com IA.

## 📋 Estrutura do Projeto

```
whatsapp-evolution-api/
├── app/
│   └── api/                    # API Routes
│       ├── webhook/            # Webhook da Evolution API (repassa para projeto cérebro)
│       ├── instance/           # Gerenciar instâncias WhatsApp
│       ├── conversations/      # Gerenciar conversas
│       └── products/           # Gerenciar produtos
├── lib/
│   ├── evolution-api.ts        # Cliente Evolution API
│   ├── supabase.ts             # Cliente Supabase (legado)
│   └── services/
│       ├── sqlite-service.ts   # Serviço SQLite (banco de dados principal)
│       ├── supabase-service.ts # Serviço de banco (usa SQLite)
│       └── products.ts         # Serviço de produtos
├── types/
│   ├── index.ts                # Types principais
│   └── supabase.ts             # Types do Supabase
├── docs/                       # Documentação
│   ├── ARQUITETURA_BACKEND.md
│   ├── ESPECIFICACAO_TECNICA_BACKEND.md
│   ├── GUIA_RAPIDO_BACKEND.md
│   └── RESUMO_BACKEND.md
├── SCRIPTS_SUPABASE.sql        # Scripts SQL do Supabase
└── package.json
```

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` com as seguintes variáveis:

```env
# Evolution API
NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-secreta

# SQLite Database
# Caminho do banco de dados SQLite (padrão: ./data/whatsapp.db)
SQLITE_DB_PATH=./data/whatsapp.db

# Webhook
WEBHOOK_SECRET=sua-chave-secreta-webhook

# Projeto Cérebro (onde está a lógica de IA)
BRAIN_WEBHOOK_URL=https://seu-projeto-cerebro.com/api/webhook
BRAIN_WEBHOOK_SECRET=sua-chave-secreta
```

### 3. Banco de Dados SQLite

✅ **O sistema usa SQLite como banco de dados principal**. O banco é criado automaticamente na primeira execução.

O banco de dados será criado no caminho especificado em `SQLITE_DB_PATH` (padrão: `./data/whatsapp.db`). O diretório `data/` é criado automaticamente se não existir.

**Testar o banco de dados:**
```bash
npm run test:sqlite
```

### 4. Configurar Evolution API

Configure a Evolution API para enviar webhooks para:

```
https://seu-dominio.vercel.app/api/webhook
```

Configure os eventos:
- `messages.upsert`
- `connection.update`
- `qrcode.update`

## 📡 API Routes

### Instâncias WhatsApp

- `POST /api/instance/connect` - Conectar instância e obter QR Code
- `DELETE /api/instance/disconnect` - Desconectar instância
- `GET /api/instance/status` - Obter status da instância

### Webhook

- `POST /api/webhook` - Recebe eventos da Evolution API e repassa para o projeto cérebro

### Conversas

- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/[id]` - Obter conversa por ID
- `POST /api/conversations/[id]/messages` - Enviar mensagem
- `PUT /api/conversations/[id]/takeover` - Assumir conversa
- `PUT /api/conversations/[id]/resolve` - Resolver conversa

### Produtos

- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto
- `PUT /api/products/[id]` - Atualizar produto
- `DELETE /api/products/[id]` - Deletar produto
- `POST /api/products/upload-image` - Upload de imagem

## 🔄 Fluxo de Funcionamento

### Arquitetura

```
Evolution API (WhatsApp)
    ↓
Este Projeto (Motor) - Recebe webhooks, gerencia instâncias
    ↓
Projeto Cérebro - Processa mensagens com IA, lógica de bot
```

### Fluxo de Mensagens

1. **Mensagem Recebida**: Evolution API → Webhook deste projeto → Salva no banco → Repassa para projeto cérebro
2. **Processamento**: Projeto cérebro processa com Groq AI e decide resposta
3. **Resposta**: Projeto cérebro chama este projeto → Este projeto envia via Evolution API

### Fluxo de Conexão

1. **Conexão WhatsApp**: Usuário conecta instância via QR Code
2. **Status**: Evolution API envia webhook → Este projeto atualiza status no banco

## 🛠️ Desenvolvimento

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start
```

## 📚 Documentação

### 📖 Documentação Principal (Leia Primeiro)

- **`docs/INDICE_DOCUMENTACAO.md`** - Índice completo de toda documentação
- **`docs/ARQUITETURA_ATUAL.md`** ⭐ **LEIA PRIMEIRO** - Arquitetura atual (motor vs cérebro)
- **`docs/GUIA_INICIO_DESENVOLVIMENTO.md`** 🚀 - Guia para iniciar desenvolvimento
- **`docs/CHECKLIST_DESENVOLVIMENTO.md`** ✅ - Checklist de desenvolvimento

### 📚 Documentação de Referência

- `docs/ARQUITETURA_BACKEND.md` - Arquitetura completa (⚠️ pode estar desatualizada)
- `docs/ESPECIFICACAO_TECNICA_BACKEND.md` - Especificação técnica (⚠️ pode estar desatualizada)
- `docs/GUIA_RAPIDO_BACKEND.md` - Guia rápido (⚠️ pode estar desatualizada)
- `docs/RESUMO_BACKEND.md` - Resumo executivo (⚠️ pode estar desatualizada)

**⚠️ IMPORTANTE:** Sempre consulte `docs/ARQUITETURA_ATUAL.md` antes de seguir as documentações de referência, pois podem conter referências à lógica de IA que foi movida para o projeto cérebro.

## 🔐 Segurança

- Autenticação via Supabase Auth
- Row Level Security (RLS) no Supabase
- Validação de webhook (opcional via WEBHOOK_SECRET)
- Autenticação ao repassar para projeto cérebro (BRAIN_WEBHOOK_SECRET)

## 🔌 Integração com Projeto Cérebro

Este projeto repassa todos os eventos recebidos da Evolution API para o projeto cérebro através da URL configurada em `BRAIN_WEBHOOK_URL`.

O projeto cérebro deve implementar um webhook que recebe os mesmos eventos da Evolution API e processa com IA.

## 📝 Próximos Passos

- [ ] Implementar rotas de campanhas
- [ ] Implementar rotas de grupos
- [ ] Adicionar retry ao repassar eventos para projeto cérebro
- [ ] Adicionar logs e monitoramento
- [ ] Implementar sistema de filas para eventos
