# 🚀 Quick Start - Início Rápido

## ⚡ Início Rápido (5 minutos)

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o exemplo e configure suas variáveis:

```bash
# Crie .env.local na raiz do projeto
cp .env.local.example .env.local
# Edite .env.local com suas credenciais
```

**Variáveis obrigatórias:**
- `NEXT_PUBLIC_EVOLUTION_API_URL` - URL da Evolution API
- `EVOLUTION_API_KEY` - Chave da Evolution API
- `NEXT_PUBLIC_SUPABASE_URL` - URL do Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anon do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave service role do Supabase

**Variáveis opcionais:**
- `WEBHOOK_SECRET` - Chave secreta para validar webhooks
- `BRAIN_WEBHOOK_URL` - URL do projeto cérebro (se já estiver configurado)
- `BRAIN_WEBHOOK_SECRET` - Chave secreta do projeto cérebro

### 3. Configurar Supabase

1. Execute `SCRIPTS_SUPABASE.sql` no SQL Editor do Supabase
2. Crie bucket de Storage chamado `products`
3. Configure políticas de acesso do Storage

### 4. Configurar Evolution API

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

O servidor estará rodando em `http://localhost:3000`

### 6. Testar Integrações

```bash
# Testar Evolution API
npm run test:evolution

# Testar Supabase
npm run test:supabase
```

---

## ✅ Checklist Rápido

- [ ] Dependências instaladas (`npm install`)
- [ ] Variáveis de ambiente configuradas (`.env.local`)
- [ ] Supabase configurado (scripts SQL executados)
- [ ] Evolution API rodando (Docker)
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Testes passando (`npm run test:evolution` e `npm run test:supabase`)

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
```

---

## 🐛 Troubleshooting Rápido

### Erro: "Evolution API não responde"
- Verifique se Evolution API está rodando: `docker ps`
- Verifique `NEXT_PUBLIC_EVOLUTION_API_URL` no `.env.local`
- Verifique `EVOLUTION_API_KEY` no `.env.local`

### Erro: "Supabase não conecta"
- Verifique variáveis de ambiente do Supabase
- Verifique se scripts SQL foram executados
- Verifique se RLS está configurado

### Erro: "Webhook não recebe eventos"
- Verifique se Evolution API está configurada para enviar webhooks
- Verifique `WEBHOOK_URL` na Evolution API
- Verifique se servidor está acessível (use ngrok se necessário)

---

## 📚 Próximos Passos

1. **Ler documentação completa:**
   - `docs/ARQUITETURA_ATUAL.md` - Arquitetura atual
   - `docs/GUIA_INICIO_DESENVOLVIMENTO.md` - Guia completo

2. **Testar APIs:**
   - Conectar instância WhatsApp
   - Receber mensagem
   - Enviar mensagem

3. **Configurar projeto cérebro:**
   - Configurar `BRAIN_WEBHOOK_URL`
   - Testar repasse de eventos

---

**Última atualização:** 2024
**Versão:** 1.0

