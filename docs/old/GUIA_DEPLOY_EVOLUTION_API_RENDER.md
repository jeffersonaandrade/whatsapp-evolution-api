# 🚀 Guia Completo: Deploy da Evolution API no Render.com

Este guia passo a passo te ajuda a publicar a **Evolution API** (Docker) no **Render.com** para manter sua conexão WhatsApp rodando 24/7.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Passo 1: Criar Serviço no Render](#passo-1-criar-serviço-no-render)
4. [Passo 2: Configurar Docker](#passo-2-configurar-docker)
5. [Passo 3: Variáveis de Ambiente](#passo-3-variáveis-de-ambiente)
6. [Passo 4: Deploy e Teste](#passo-4-deploy-e-teste)
7. [Passo 5: Configurar UptimeRobot](#passo-5-configurar-uptimerobot)
8. [Passo 6: Integrar com seu Motor (Vercel)](#passo-6-integrar-com-seu-motor-vercel)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que vamos fazer?

1. **Criar um Web Service no Render.com** para rodar a Evolution API (Docker)
2. **Configurar todas as variáveis de ambiente** necessárias
3. **Fazer o deploy** e garantir que está funcionando
4. **Configurar o UptimeRobot** para manter o servidor acordado 24/7

### Arquitetura Final

```
┌─────────────────────────────────┐
│   Motor (Next.js na Vercel)     │
│   - API Routes                   │
│   - Frontend                     │
└──────────────┬──────────────────┘
               │ HTTP
               │
               ▼
┌─────────────────────────────────┐
│  Evolution API (Render.com)     │
│  - Docker Container              │
│  - Rodando 24/7                  │
└──────────────┬──────────────────┘
               │ Webhook
               │
               ▼
┌─────────────────────────────────┐
│  WhatsApp (WebSocket)            │
└─────────────────────────────────┘
```

---

## ✅ Pré-requisitos

Antes de começar, você precisa ter:

- [x] Conta no **Render.com** (gratuita): [https://render.com](https://render.com)
- [x] Conta no **UptimeRobot** (gratuita): [https://uptimerobot.com](https://uptimerobot.com)
- [x] URL do seu **Motor (Next.js) na Vercel** (ex: `https://seu-app.vercel.app`)
- [x] **API Key** da Evolution API (vai criar durante o processo)

---

## 📝 Passo 1: Criar Serviço no Render

### 1.1. Acessar o Render

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Faça login (ou crie uma conta se ainda não tiver)
3. Clique em **"New +"** no topo direito
4. Selecione **"Web Service"**

> ⚠️ **Importante:** Escolha **"Web Service"**, não "Private Service" ou "Background Worker". O Web Service permite acesso público via HTTP/HTTPS.

### 1.2. Conectar Repositório (ou Usar Docker)

Você tem **2 opções**:

#### Opção A: Usar Docker diretamente (Recomendado - Mais Simples)

Se você só quer rodar a Evolution API sem código customizado:

1. Na tela de criação, selecione **"Use an existing image from a registry"**
2. Cole a imagem Docker: `atendai/evolution-api:latest`
3. Clique em **"Next"**

#### Opção B: Conectar Repositório GitHub

Se você tem um repositório com `Dockerfile`:

1. Conecte sua conta GitHub (se ainda não conectou)
2. Selecione o repositório que contém o `docker-compose.yml` ou `Dockerfile`
3. Clique em **"Connect"**

### 1.3. Configurar o Serviço

Preencha os campos:

- **Name:** `evolution-api` (ou qualquer nome que você preferir)
- **Region:** Escolha a região mais próxima (ex: `Oregon (US West)`)
- **Branch:** `main` (ou `master`, dependendo do seu repositório)
- **Root Directory:** Deixe vazio (ou `./` se estiver em subpasta)
- **Environment:** `Docker`
- **Dockerfile Path:** Deixe vazio (se usar Opção A) ou `./Dockerfile`
- **Docker Command:** Deixe vazio (Render detecta automaticamente)

### 1.4. Plano e Recursos

- **Instance Type:** Escolha **"Free"** (para começar)
  - ⚠️ **Nota:** O plano free tem limitações (veja [Passo 5](#passo-5-configurar-uptimerobot) sobre UptimeRobot)
- **Auto-Deploy:** Mantenha `Yes` (para atualizações automáticas)

---

## 🐳 Passo 2: Configurar Docker

### 2.1. Se usar Opção A (Imagem Direta)

Não precisa fazer nada agora, vamos configurar via variáveis de ambiente.

### 2.2. Se usar Opção B (Repositório)

Crie um arquivo `Dockerfile` na raiz do seu repositório:

```dockerfile
FROM atendai/evolution-api:latest

# Expor a porta
EXPOSE 8080

# O comando de inicialização já está configurado na imagem
# Não precisa definir CMD, a imagem já tem
```

Ou, se preferir usar `docker-compose.yml`, o Render também suporta (mas geralmente é mais simples usar `Dockerfile`).

---

## 🔧 Passo 3: Variáveis de Ambiente

Este é o passo **mais importante**! Vamos configurar todas as variáveis que a Evolution API precisa.

### 3.1. Acessar Configurações de Environment

1. No painel do serviço que você criou, clique em **"Environment"** no menu lateral
2. Vamos adicionar cada variável uma por uma

### 3.2. Variáveis Obrigatórias

Adicione as seguintes variáveis de ambiente:

#### Configuração do Servidor

```
Key: SERVER_URL
Value: https://evolution-api.onrender.com
```
> ⚠️ **Importante:** Substitua `evolution-api` pelo nome do seu serviço no Render. Você vai ver a URL completa após o primeiro deploy.

```
Key: PORT
Value: 8080
```

#### API Key (Segurança)

```
Key: API_KEY
Value: sua-chave-super-secreta-aqui-123456
```
> 🔐 **Dica:** Use uma chave forte e única. Você vai usar essa mesma chave no seu Motor (Next.js).

#### Webhook (Comunicação com seu Motor)

```
Key: WEBHOOK_URL
Value: https://seu-app.vercel.app/api/webhook
```
> ⚠️ **Substitua:** `seu-app.vercel.app` pela URL real do seu Motor na Vercel.

```
Key: WEBHOOK_EVENTS
Value: messages.upsert,connection.update,qrcode.update
```

#### Configurações do WhatsApp

```
Key: QRCODE_LIMIT
Value: 30
```

```
Key: QRCODE_COLOR
Value: #198754
```

#### Logs (Recomendado para Produção)

```
Key: LOG_LEVEL
Value: ERROR
```

```
Key: LOG_COLOR
Value: true
```

```
Key: LOG_BAILEYS
Value: error
```

#### Configurações de Instância

```
Key: CONFIG_SESSION_PHONE_CLIENT
Value: Chrome
```

```
Key: CONFIG_SESSION_PHONE_NAME
Value: Chrome
```

#### Database (Opcional - Se quiser persistir instâncias)

Se você quiser usar um banco de dados externo (Recomendado para produção):

```
Key: DATABASE_ENABLED
Value: true
```

```
Key: DATABASE_PROVIDER
Value: postgresql
```

```
Key: DATABASE_CONNECTION_URI
Value: postgresql://usuario:senha@host:porta/database
```

> 💡 **Dica:** Para começar, você pode deixar o banco desabilitado (`DATABASE_ENABLED=false` ou não definir). As instâncias serão salvas localmente no container (podem ser perdidas em restart).

### 3.3. Exemplo Completo de Variáveis

Aqui está um exemplo completo do que você deve ter:

```env
# Servidor
SERVER_URL=https://evolution-api.onrender.com
PORT=8080

# Segurança
API_KEY=minha-chave-super-secreta-abc123xyz

# Webhook (apontando para seu Motor na Vercel)
WEBHOOK_URL=https://meu-motor.vercel.app/api/webhook
WEBHOOK_EVENTS=messages.upsert,connection.update,qrcode.update

# WhatsApp
QRCODE_LIMIT=30
QRCODE_COLOR=#198754

# Logs
LOG_LEVEL=ERROR
LOG_COLOR=true
LOG_BAILEYS=error

# Instância
CONFIG_SESSION_PHONE_CLIENT=Chrome
CONFIG_SESSION_PHONE_NAME=Chrome

# Database (opcional)
DATABASE_ENABLED=false
```

---

## 🚀 Passo 4: Deploy e Teste

### 4.1. Fazer o Deploy

1. Clique em **"Save Changes"** (ou **"Create Web Service"** se for a primeira vez)
2. O Render vai começar a fazer o build e deploy automaticamente
3. Aguarde alguns minutos (primeiro deploy pode demorar 5-10 minutos)
4. Você vai ver os logs em tempo real na aba **"Logs"**

### 4.2. Verificar se Está Funcionando

#### 4.2.1. Verificar Logs

Na aba **"Logs"** do Render, você deve ver algo como:

```
✅ Server started successfully
✅ Listening on port 8080
✅ Evolution API is ready
```

Se aparecer algum erro, veja a seção [Troubleshooting](#troubleshooting).

#### 4.2.2. Testar a API

Após o deploy, você vai receber uma URL como:
```
https://evolution-api.onrender.com
```

Teste no navegador ou Postman:

**GET** `https://evolution-api.onrender.com/`
- Deve retornar informações da API

**GET** `https://evolution-api.onrender.com/instance/fetchInstances`
- Headers: `apikey: sua-chave-super-secreta-abc123xyz`
- Deve retornar uma lista de instâncias (provavelmente vazia no começo)

Se funcionar, **sucesso!** 🎉

### 4.3. Anotar a URL

⚠️ **Importante:** Anote a URL final do seu serviço. Você vai precisar:

1. **Atualizar a variável `SERVER_URL`** no Render com a URL correta
2. **Usar essa URL no seu Motor (Next.js)** na variável `NEXT_PUBLIC_EVOLUTION_API_URL`

---

## ⏰ Passo 5: Configurar UptimeRobot

O plano **gratuito do Render** desliga o servidor após **15 minutos de inatividade**. A Evolution API **NÃO pode desligar**, então precisamos "pingar" ela constantemente.

### 5.1. Criar Conta no UptimeRobot

1. Acesse [https://uptimerobot.com](https://uptimerobot.com)
2. Crie uma conta (gratuita)
3. Confirme seu email

### 5.2. Adicionar Monitor

1. No dashboard, clique em **"+ Add New Monitor"**
2. Preencha os campos:

   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Evolution API - Keep Alive`
   - **URL:** `https://evolution-api.onrender.com/` (sua URL do Render)
   - **Monitoring Interval:** `5 minutes` (gratuito permite mínimo 5 minutos)
   - **Alert Contacts:** Selecione seu email (ou crie um novo)

3. Clique em **"Create Monitor"**

### 5.3. Como Funciona

O UptimeRobot vai fazer uma requisição HTTP a cada 5 minutos para sua Evolution API. Isso **impede** o Render de desligar o servidor por inatividade.

⚠️ **Limitação do Plano Free:**
- O UptimeRobot gratuito permite **mínimo de 5 minutos** entre checks
- Isso significa que o servidor pode "dormir" entre os pings
- Se precisar de garantia 100%, considere:
  - **Opção 1:** Upgrade para plano pago do Render ($7/mês)
  - **Opção 2:** Usar outro serviço de ping (cron-job.org, etc.)

---

## 🔗 Passo 6: Integrar com seu Motor (Vercel)

Agora você precisa configurar seu **Motor (Next.js)** para se comunicar com a Evolution API no Render.

### 6.1. Variáveis de Ambiente no Vercel

No projeto do seu Motor na Vercel, adicione/atualize as variáveis:

```
NEXT_PUBLIC_EVOLUTION_API_URL=https://evolution-api.onrender.com
EVOLUTION_API_KEY=sua-chave-super-secreta-abc123xyz
```

⚠️ **Importante:** A `API_KEY` deve ser **exatamente a mesma** que você configurou no Render!

### 6.2. Atualizar Webhook URL no Render

Se você ainda não tinha a URL do Motor quando configurou o Render, atualize agora:

1. No Render, vá em **"Environment"**
2. Atualize a variável `WEBHOOK_URL`:
   ```
   WEBHOOK_URL=https://seu-app.vercel.app/api/webhook
   ```
3. Clique em **"Save Changes"**
4. O Render vai reiniciar o serviço automaticamente

### 6.3. Testar a Integração

1. No seu Motor (Next.js), tente criar uma instância via `/api/test/instance/connect`
2. Verifique os logs do Render para ver se a Evolution API recebeu a requisição
3. Verifique os logs do Vercel para ver se o webhook foi recebido

---

## 🔍 Troubleshooting

### Erro: "Build Failed"

**Causa:** Problema com Dockerfile ou imagem.

**Solução:**
- Verifique se a imagem `atendai/evolution-api:latest` existe
- Se usar Dockerfile customizado, teste localmente primeiro
- Verifique os logs de build no Render

### Erro: "Service Unavailable" ou Timeout

**Causa:** Servidor pode estar "dormindo" (plano free).

**Solução:**
- Aguarde alguns segundos após a primeira requisição (o servidor "acorda")
- Configure o UptimeRobot (veja [Passo 5](#passo-5-configurar-uptimerobot))
- Considere upgrade para plano pago

### Erro: "401 Unauthorized" ao chamar a API

**Causa:** API Key incorreta ou não enviada.

**Solução:**
- Verifique se a `API_KEY` no Render é a mesma no Vercel
- Verifique se está enviando o header `apikey` nas requisições
- Veja `lib/evolution-api.ts` para ver como está sendo enviado

### Erro: "Webhook não está chegando"

**Causa:** URL do webhook incorreta ou Motor não está respondendo.

**Solução:**
- Verifique se `WEBHOOK_URL` está correto no Render
- Teste a rota `/api/webhook` do seu Motor manualmente
- Verifique os logs do Vercel para ver se há erros
- Verifique se o Motor está público (não em desenvolvimento local)

### Erro: "Connection timeout" ou "Cannot connect"

**Causa:** Servidor ainda não iniciou ou porta incorreta.

**Solução:**
- Aguarde alguns minutos após o deploy
- Verifique os logs do Render para ver se iniciou corretamente
- Verifique se a porta está configurada como `8080`
- Verifique se `SERVER_URL` está com `https://` (não `http://`)

### Instâncias WhatsApp se Perdem Após Restart

**Causa:** Banco de dados não configurado (instâncias salvas localmente).

**Solução:**
- Configure `DATABASE_ENABLED=true` e `DATABASE_CONNECTION_URI`
- Use um banco PostgreSQL (Render oferece gratuitamente) ou externo (Supabase)

---

## 📚 Referências Úteis

- [Documentação do Render.com](https://render.com/docs)
- [Documentação da Evolution API](https://doc.evolution-api.com/)
- [UptimeRobot - Documentação](https://uptimerobot.com/api/)
- [Guia do Supabase (para banco opcional)](https://supabase.com/docs)

---

## ✅ Checklist Final

Antes de considerar tudo pronto, confirme:

- [ ] Serviço criado no Render.com
- [ ] Deploy realizado com sucesso
- [ ] Todos os logs estão OK (sem erros)
- [ ] API responde em `https://evolution-api.onrender.com`
- [ ] Testou criar instância via seu Motor
- [ ] Webhook está funcionando (teste enviando mensagem no WhatsApp)
- [ ] UptimeRobot configurado e ativo
- [ ] Variáveis de ambiente atualizadas no Vercel (Motor)
- [ ] `API_KEY` é a mesma no Render e Vercel
- [ ] `WEBHOOK_URL` aponta para seu Motor na Vercel

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0

