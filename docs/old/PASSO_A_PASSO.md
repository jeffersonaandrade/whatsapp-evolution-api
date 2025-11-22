# 🚀 Passo a Passo: Configurar Evolution API

Guia simples e direto para configurar tudo e testar.

## ✅ Passo 1: Criar arquivo .env.local

**JÁ FOI CRIADO!** ✅

O arquivo `.env.local` já está na raiz do projeto com as configurações básicas.

**IMPORTANTE**: Você pode mudar as chaves se quiser:
- `EVOLUTION_API_KEY`: Use uma chave secreta qualquer (ex: `minha-chave-123`)
- `WEBHOOK_SECRET`: Use outra chave secreta (ex: `webhook-456`)

## ✅ Passo 2: Iniciar Evolution API com Docker

A Evolution API **já usa WhatsApp Web.js internamente** - você não precisa instalar nada separado!

Abra o terminal na raiz do projeto e execute:

```bash
docker-compose up -d
```

Isso vai:
- Baixar a imagem da Evolution API (pode demorar alguns minutos na primeira vez)
- Iniciar o container na porta 8080
- Configurar os webhooks automaticamente

### Verificar se está rodando:

```bash
docker ps
```

Você deve ver o container `evolution-api` na lista.

### Ver logs (opcional):

```bash
docker-compose logs -f evolution-api
```

## ✅ Passo 3: Verificar se Evolution API está respondendo

Abra no navegador ou use curl:

```
http://localhost:8080
```

Ou no terminal:

```bash
curl http://localhost:8080
```

Deve retornar informações da API.

## ✅ Passo 4: Testar criar uma instância WhatsApp

Com o servidor Next.js rodando (`npm run dev`), abra outro terminal e execute:

```bash
curl -X POST http://localhost:3000/api/test/instance/connect -H "Content-Type: application/json" -d "{\"instanceName\": \"minha-instancia-1\"}"
```

**Resposta esperada**:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "instanceName": "minha-instancia-1",
  "instanceId": "instance-...",
  "message": "Escaneie o QR Code com o WhatsApp"
}
```

## ✅ Passo 5: Conectar WhatsApp

1. Copie o `qrCode` da resposta (é uma string base64)
2. Abra no navegador: https://base64.guru/converter/decode/image
3. Cole o código base64 e clique em "Decode"
4. Ou use qualquer outro decodificador de base64 para imagem
5. Abra o WhatsApp no celular
6. Vá em **Configurações** > **Aparelhos conectados** > **Conectar um aparelho**
7. Escaneie o QR Code

## ✅ Passo 6: Verificar se conectou

Execute:

```bash
curl "http://localhost:3000/api/test/instance/status?instanceName=minha-instancia-1"
```

**Resposta esperada**:
```json
{
  "instance": {
    "id": "instance-...",
    "name": "minha-instancia-1",
    "status": "connected"
  },
  "evolutionState": "open",
  "status": "connected"
}
```

## ✅ Passo 7: Testar Webhook (Receber Mensagem)

1. Envie uma mensagem do WhatsApp para o número que você conectou
2. Olhe os logs do Next.js (terminal onde está rodando `npm run dev`)

Você deve ver algo como:
```
[Webhook] Evento recebido: messages.upsert
[Webhook] Instância encontrada: minha-instancia-1
```

## ✅ Passo 8: Testar Enviar Mensagem

Execute (substitua o número pelo número completo com código do país):

```bash
curl -X POST http://localhost:3000/api/test/message/send -H "Content-Type: application/json" -d "{\"instanceName\": \"minha-instancia-1\", \"number\": \"5511999999999\", \"text\": \"Olá! Esta é uma mensagem de teste.\"}"
```

**Nota**: Use o número completo com código do país:
- Brasil: `5511999999999` (55 = código do país, 11 = DDD, 999999999 = número)
- Sem espaços, sem parênteses, sem hífens

## ✅ Passo 9: Ver Conversas

Execute:

```bash
curl http://localhost:3000/api/test/conversations
```

Deve retornar as conversas que foram criadas quando você recebeu mensagens.

## 🐛 Problemas Comuns

### Erro: "Cannot connect to Evolution API"

1. Verifique se o Docker está rodando: `docker ps`
2. Verifique se o container está ativo: `docker-compose ps`
3. Reinicie: `docker-compose restart`

### Erro: "Invalid API Key"

1. Verifique se o `.env.local` tem `EVOLUTION_API_KEY`
2. Verifique se o `docker-compose.yml` está usando a mesma chave
3. Reinicie o container: `docker-compose restart`

### QR Code não aparece

1. Verifique se a Evolution API está respondendo: `curl http://localhost:8080`
2. Verifique os logs: `docker-compose logs evolution-api`
3. Tente criar uma nova instância com outro nome

### Webhook não recebe eventos

1. Verifique se o Next.js está rodando na porta 3000
2. Verifique se `WEBHOOK_URL` no `docker-compose.yml` está correto
3. Verifique os logs do Next.js

## 📝 Resumo dos Comandos

```bash
# Iniciar Evolution API
docker-compose up -d

# Ver logs
docker-compose logs -f evolution-api

# Parar Evolution API
docker-compose down

# Criar instância
curl -X POST http://localhost:3000/api/test/instance/connect -H "Content-Type: application/json" -d "{\"instanceName\": \"minha-instancia-1\"}"

# Ver status
curl "http://localhost:3000/api/test/instance/status?instanceName=minha-instancia-1"

# Enviar mensagem
curl -X POST http://localhost:3000/api/test/message/send -H "Content-Type: application/json" -d "{\"instanceName\": \"minha-instancia-1\", \"number\": \"5511999999999\", \"text\": \"Olá!\"}"

# Ver conversas
curl http://localhost:3000/api/test/conversations
```

## 🎯 Próximos Passos

Depois que tudo estiver funcionando:

1. ✅ Evolution API rodando
2. ✅ WhatsApp conectado
3. ✅ Webhook recebendo mensagens
4. ⏭️ Integrar com projeto cérebro (quando estiver pronto)
5. ⏭️ Configurar Supabase real (quando necessário)

