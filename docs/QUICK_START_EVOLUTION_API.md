# Quick Start: Evolution API

Guia rápido para começar a usar a Evolution API com WhatsApp.

## 🚀 Passos Rápidos

### 1. Configurar Variáveis de Ambiente

Crie `.env.local`:

```env
NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=minha-chave-secreta-123
WEBHOOK_URL=http://localhost:3000/api/webhook
WEBHOOK_SECRET=webhook-secret-456
USE_MOCK_SUPABASE=true
```

### 2. Iniciar Evolution API

```bash
docker-compose up -d
```

### 3. Verificar se está rodando

```bash
docker ps
```

### 4. Conectar WhatsApp (Rota de Teste)

```bash
curl -X POST http://localhost:3000/api/test/instance/connect \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "minha-instancia-1"}'
```

**Resposta**: QR Code em base64

### 5. Escanear QR Code

1. Abra WhatsApp no celular
2. Vá em **Configurações** > **Aparelhos conectados** > **Conectar um aparelho**
3. Escaneie o QR Code retornado

### 6. Verificar Status

```bash
curl "http://localhost:3000/api/test/instance/status?instanceName=minha-instancia-1"
```

### 7. Enviar Mensagem de Teste

```bash
curl -X POST http://localhost:3000/api/test/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "minha-instancia-1",
    "number": "5511999999999",
    "text": "Olá! Teste de mensagem."
  }'
```

**Nota**: Use número completo com código do país (ex: `5511999999999`)

### 8. Ver Conversas

```bash
curl http://localhost:3000/api/test/conversations
```

## 📚 Documentação Completa

Para mais detalhes, veja: [`docs/GUIA_EVOLUTION_API.md`](GUIA_EVOLUTION_API.md)

## ⚠️ Importante

- As rotas `/api/test/*` são apenas para desenvolvimento
- **Remova ou proteja essas rotas em produção**
- Use autenticação nas rotas de produção (`/api/instance/*`, etc.)

