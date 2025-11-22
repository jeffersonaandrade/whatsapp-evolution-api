# 🔗 Integração Frontend com Backend

## 📋 O que o Frontend precisa fazer

### 1. **URL do Backend**

Configure a URL do backend nas variáveis de ambiente:

```env
NEXT_PUBLIC_API_URL=https://whatsapp-evolution-api-fa3y.onrender.com/api
```

### 2. **Headers Obrigatórios**

Todas as requisições devem incluir:

```javascript
headers: {
  'Content-Type': 'application/json',
  'Origin': 'https://jarespondi.netlify.app', // Sua URL do frontend
}
```

### 3. **Cookies (Autenticação)**

Requisições autenticadas precisam enviar cookies:

```javascript
credentials: 'include', // IMPORTANTE: inclui cookies
```

### 4. **Rate Limiting**

O backend limita a **100 requisições por minuto por IP/User**.

Se receber `429 Too Many Requests`:
- Aguarde o tempo indicado em `Retry-After` (em segundos)
- Implemente retry com backoff exponencial

### 5. **Exemplo de Requisição**

```javascript
const response = await fetch('https://whatsapp-evolution-api-fa3y.onrender.com/api/instance/status', {
  method: 'GET',
  credentials: 'include', // IMPORTANTE
  headers: {
    'Content-Type': 'application/json',
  },
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limit. Aguarde ${retryAfter} segundos`);
  // Implementar retry
}

const data = await response.json();
```

### 6. **Tratamento de Erros**

```javascript
if (response.status === 401) {
  // Não autenticado - redirecionar para login
}
if (response.status === 403) {
  // Sem permissão
}
if (response.status === 429) {
  // Rate limit - aguardar e tentar novamente
}
if (response.status >= 500) {
  // Erro do servidor - retry com backoff
}
```

---

## ✅ Checklist para o Frontend

- [ ] URL do backend configurada em variáveis de ambiente
- [ ] Todas as requisições incluem `credentials: 'include'`
- [ ] Headers `Content-Type: application/json` em requisições POST/PUT
- [ ] Tratamento de rate limiting (429) implementado
- [ ] Retry com backoff exponencial para erros 5xx
- [ ] Tratamento de erros 401 (não autenticado)
- [ ] Tratamento de erros 403 (sem permissão)

---

## 🔐 Endpoints Disponíveis

### Instâncias WhatsApp
- `GET /api/instance/status` - Status da instância
- `POST /api/instance/connect` - Conectar instância
- `DELETE /api/instance/disconnect` - Desconectar instância

### Conversas
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/[id]` - Obter conversa
- `POST /api/conversations/[id]/messages` - Enviar mensagem

### Produtos
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto

### Health Check
- `GET /api/health` - Health check (não requer autenticação)

---

## 📝 Notas Importantes

1. **CORS**: Configurado para `https://jarespondi.netlify.app`
2. **Rate Limiting**: 100 req/min por IP/User
3. **Timeout**: 30 segundos para requisições externas
4. **Headers de Segurança**: Aplicados automaticamente
5. **Autenticação**: Via cookies (SameSite, Secure)

