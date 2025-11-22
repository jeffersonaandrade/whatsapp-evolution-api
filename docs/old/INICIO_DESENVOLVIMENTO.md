# 🚀 Início do Desenvolvimento

## ✅ Status Atual

### ✅ Implementado

- ✅ Estrutura base do projeto Next.js
- ✅ Cliente Evolution API (`lib/evolution-api.ts`)
- ✅ Cliente Supabase (`lib/supabase.ts`)
- ✅ Webhook recebendo e repassando eventos
- ✅ APIs de instâncias WhatsApp
- ✅ APIs de conversas
- ✅ APIs de produtos
- ✅ Scripts de teste
- ✅ Docker Compose para Evolution API
- ✅ Documentação completa

### ⏳ Próximos Passos

1. **Configurar ambiente local**
2. **Configurar Supabase**
3. **Configurar Evolution API**
4. **Testar integrações**

---

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Evolution API
NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-secreta

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Webhook
WEBHOOK_SECRET=sua-chave-secreta-webhook

# Projeto Cérebro
BRAIN_WEBHOOK_URL=http://localhost:3001/api/webhook
BRAIN_WEBHOOK_SECRET=sua-chave-secreta
```

### 3. Configurar Supabase

1. Execute `SCRIPTS_SUPABASE.sql` no SQL Editor do Supabase
2. Crie bucket de Storage chamado `products`
3. Configure políticas de acesso do Storage

### 4. Iniciar Evolution API

```bash
# Iniciar Evolution API com Docker
docker-compose up -d

# Verificar se está rodando
curl http://localhost:8080/health
```

### 5. Iniciar Servidor

```bash
npm run dev
```

### 6. Testar Integrações

```bash
# Testar Evolution API
npm run test:evolution

# Testar Supabase
npm run test:supabase
```

---

## 📚 Documentação

### Leia Primeiro

1. **`docs/ARQUITETURA_ATUAL.md`** ⭐ - Arquitetura atual (motor vs cérebro)
2. **`docs/QUICK_START.md`** 🚀 - Guia rápido de início
3. **`docs/GUIA_INICIO_DESENVOLVIMENTO.md`** - Guia completo de desenvolvimento

### Referência

- `docs/CHECKLIST_DESENVOLVIMENTO.md` - Checklist de desenvolvimento
- `docs/INDICE_DOCUMENTACAO.md` - Índice de toda documentação
- `README.md` - Documentação principal

---

## 🎯 Arquitetura

### Este Projeto (Motor)

**Responsabilidades:**
- ✅ Integração com Evolution API
- ✅ Gerenciamento de instâncias WhatsApp
- ✅ Recebimento e repasse de webhooks
- ✅ Persistência básica no Supabase

**NÃO faz:**
- ❌ Processamento de IA (Groq AI)
- ❌ Lógica de bot
- ❌ Análise de intenção

### Projeto Cérebro (Outro Projeto)

**Responsabilidades:**
- ✅ Processamento de IA (Groq AI)
- ✅ Lógica de bot
- ✅ Análise de intenção
- ✅ Geração de respostas automáticas

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Lint
npm run lint

# Testes
npm run test:evolution
npm run test:supabase

# Docker (Evolution API)
docker-compose up -d
docker-compose down
docker-compose logs -f
```

---

## ⚠️ Importante

**Antes de fazer mudanças:**
1. Ler `docs/ARQUITETURA_ATUAL.md`
2. Verificar se não quebra a separação motor/cérebro
3. NUNCA adicionar lógica de IA no motor

---

**Vamos começar! 🚀**

