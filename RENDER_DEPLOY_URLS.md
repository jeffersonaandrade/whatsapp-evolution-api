# URLs de Deploy no Render

## 🚀 Serviços Deployados

### Motor (Next.js Backend)
- **URL:** https://whatsapp-evolution-api-fa3y.onrender.com/
- **Status:** ✅ Deployado e funcionando
- **Data de Deploy:** 2024-12-XX

### Evolution API (Docker)
- **URL:** https://evolution-api-v2-1-1-uuvk.onrender.com
- **Status:** ✅ Deployado e funcionando
- **Imagem Docker:** `atendai/evolution-api:latest`

---

## 📝 Variáveis de Ambiente

### Motor (Next.js)
```
NEXT_PUBLIC_EVOLUTION_API_URL=https://evolution-api-v2-1-1-uuvk.onrender.com
EVOLUTION_API_KEY=sua-chave-secreta
NEXT_PUBLIC_FRONTEND_URL=https://seu-frontend.vercel.app (ou localhost:3000 para dev)
WEBHOOK_SECRET=webhook-secret-456
USE_MOCK_SUPABASE=true
```

### Evolution API
```
SERVER_URL=https://evolution-api-v2-1-1-uuvk.onrender.com
PORT=8080
AUTHENTICATION_API_KEY=sua-chave-secreta (mesma do Motor)
WEBHOOK_URL=https://whatsapp-evolution-api-fa3y.onrender.com/api/webhook
WEBHOOK_EVENTS=messages.upsert,connection.update,qrcode.update
QRCODE_LIMIT=30
QRCODE_COLOR=#198754
LOG_LEVEL=ERROR
LOG_COLOR=true
LOG_BAILEYS=error
CONFIG_SESSION_PHONE_CLIENT=Chrome
CONFIG_SESSION_PHONE_NAME=Chrome
DATABASE_ENABLED=false
```

---

## 🔗 Conexões

- **Evolution API → Motor:** Webhook enviado para `https://whatsapp-evolution-api-fa3y.onrender.com/api/webhook`
- **Motor → Evolution API:** Requisições para `https://evolution-api-v2-1-1-uuvk.onrender.com`

---

## 📌 Notas

- Motor deployado com sucesso: https://whatsapp-evolution-api-fa3y.onrender.com/
- Evolution API deployada com sucesso: https://evolution-api-v2-1-1-uuvk.onrender.com
- ⚠️ **IMPORTANTE:** Atualizar variável `NEXT_PUBLIC_EVOLUTION_API_URL` no Motor para apontar para a Evolution API
- ⚠️ **IMPORTANTE:** Verificar se a variável `SERVER_URL` na Evolution API está correta
- Database desabilitado inicialmente para facilitar deploy
- Para produção futura, considerar habilitar PostgreSQL no Render

