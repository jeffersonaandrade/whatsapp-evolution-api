# Guia de Verificação do Sistema

Este guia mostra como verificar se o banco de dados e as APIs estão funcionando corretamente.

## 🚀 Verificação Rápida

Execute o script de verificação completo:

```bash
npm run verify
```

Este script verifica:
- ✅ Banco de dados SQLite e suas tabelas
- ✅ Estatísticas de registros
- ✅ APIs disponíveis (se o servidor estiver rodando)

## 📊 Acessar o Banco de Dados

### 1. Verificação Completa do Sistema

```bash
npm run verify
```

Mostra:
- Estatísticas de todas as tabelas
- Contagem de registros
- Exemplos de dados
- Status das APIs

### 2. Queries SQL Diretas

```bash
# Ver todas as instâncias
npm run query:sqlite "SELECT * FROM instances"

# Ver conversas
npm run query:sqlite "SELECT * FROM conversations LIMIT 10"

# Ver mensagens
npm run query:sqlite "SELECT * FROM messages ORDER BY created_at DESC LIMIT 10"

# Ver produtos
npm run query:sqlite "SELECT * FROM products"

# Ver contatos
npm run query:sqlite "SELECT * FROM contacts"
```

### 3. Via SQLite CLI

```bash
# Abrir o banco
sqlite3 data/whatsapp.db

# Dentro do SQLite:
.tables                    # Listar tabelas
.schema instances          # Ver estrutura
SELECT * FROM instances;   # Executar query
```

### 4. Via Ferramentas Gráficas

**DB Browser for SQLite:**
1. Baixe: https://sqlitebrowser.org/
2. Abra: `data/whatsapp.db`

**DBeaver:**
1. Baixe: https://dbeaver.io/
2. Nova conexão → SQLite → Path: `data/whatsapp.db`

## 🌐 Testar APIs

### APIs de Teste (Sem Autenticação)

Estas rotas não requerem autenticação e são úteis para testes:

#### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

#### 2. Listar Conversas (Teste)
```bash
curl http://localhost:3001/api/test/conversations
```

#### 3. Status da Instância (Teste)
```bash
# Primeiro, obtenha o nome de uma instância do banco
curl "http://localhost:3001/api/test/instance/status?instanceName=nome-da-instancia"
```

### APIs Principais (Requerem Autenticação)

Estas APIs requerem autenticação via cookies:

#### 1. Status da Instância
```bash
GET /api/instance/status?instanceName=nome-da-instancia
```

#### 2. Listar Conversas
```bash
GET /api/conversations?instanceId=id&status=bot
```

#### 3. Obter Conversa
```bash
GET /api/conversations/[id]
```

#### 4. Listar Produtos
```bash
GET /api/products
```

## 📋 Queries Úteis

### Ver Instâncias Conectadas
```sql
SELECT id, name, status, phone_number, created_at 
FROM instances 
WHERE status = 'connected';
```

### Ver Conversas Recentes com Detalhes
```sql
SELECT 
  c.id,
  c.status,
  c.last_message_at,
  ct.name as contact_name,
  ct.phone_number,
  i.name as instance_name
FROM conversations c
JOIN contacts ct ON c.contact_id = ct.id
JOIN instances i ON c.instance_id = i.id
ORDER BY c.last_message_at DESC
LIMIT 10;
```

### Contar Mensagens por Conversa
```sql
SELECT 
  conversation_id,
  COUNT(*) as total_messages,
  SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received
FROM messages
GROUP BY conversation_id;
```

### Ver Estatísticas Gerais
```sql
-- Total de registros por tabela
SELECT 'instances' as tabela, COUNT(*) as total FROM instances
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'products', COUNT(*) FROM products;
```

## 🔍 Verificar Integridade dos Dados

### Verificar Foreign Keys
```sql
-- Conversas sem instância válida
SELECT c.id, c.instance_id 
FROM conversations c
LEFT JOIN instances i ON c.instance_id = i.id
WHERE i.id IS NULL;

-- Mensagens sem conversa válida
SELECT m.id, m.conversation_id 
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL;
```

### Verificar Dados Duplicados
```sql
-- Contatos duplicados (mesmo account_id + phone_number)
SELECT account_id, phone_number, COUNT(*) as count
FROM contacts
GROUP BY account_id, phone_number
HAVING COUNT(*) > 1;
```

## 🧪 Testes Automatizados

### Testar Banco de Dados
```bash
npm run test:sqlite
```

### Testar Evolution API
```bash
npm run test:evolution
```

### Verificação Completa
```bash
npm run verify
```

## 📊 Monitoramento

### Ver Últimas Mensagens
```sql
SELECT 
  m.id,
  m.body,
  m.sent_by,
  m.created_at,
  c.status as conversation_status,
  ct.name as contact_name
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
JOIN contacts ct ON c.contact_id = ct.id
ORDER BY m.created_at DESC
LIMIT 20;
```

### Ver Instâncias por Conta
```sql
SELECT 
  account_id,
  COUNT(*) as total_instances,
  SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) as connected,
  SUM(CASE WHEN status = 'disconnected' THEN 1 ELSE 0 END) as disconnected
FROM instances
GROUP BY account_id;
```

## ⚠️ Importante

- **Backup**: Sempre faça backup do arquivo `whatsapp.db` antes de fazer alterações manuais
- **WAL Mode**: O banco usa WAL, então você verá arquivos `.db-shm` e `.db-wal`
- **Servidor**: Para testar APIs, o servidor precisa estar rodando (`npm run dev`)
- **Autenticação**: APIs principais requerem cookies de autenticação

## 🆘 Troubleshooting

### Banco não encontrado
```bash
# Verificar se o arquivo existe
ls -la data/whatsapp.db

# Se não existir, execute o teste para criar
npm run test:sqlite
```

### APIs não respondem
```bash
# Verificar se o servidor está rodando
npm run dev

# Verificar porta (padrão: 3001)
curl http://localhost:3001/api/health
```

### Erro ao executar queries
```bash
# Verificar se o banco está acessível
npm run query:sqlite "SELECT 1"
```

