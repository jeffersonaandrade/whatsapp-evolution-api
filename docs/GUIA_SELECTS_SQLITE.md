# Guia de SELECTs no SQLite

Este guia mostra como fazer SELECTs no banco de dados SQLite do projeto.

## 🚀 Forma Mais Rápida (Recomendada)

Use o script `query:sqlite` que já está configurado:

```bash
npm run query:sqlite "SUA_QUERY_AQUI"
```

## 📋 Exemplos Práticos

### 1. Ver Todas as Instâncias

```bash
npm run query:sqlite "SELECT * FROM instances"
```

### 2. Ver Instâncias Conectadas

```bash
npm run query:sqlite "SELECT id, name, status, phone_number FROM instances WHERE status = 'connected'"
```

### 3. Ver Conversas

```bash
npm run query:sqlite "SELECT * FROM conversations LIMIT 10"
```

### 4. Ver Conversas com Detalhes (JOIN)

```bash
npm run query:sqlite "SELECT c.id, c.status, c.last_message_at, ct.name as contact_name, ct.phone_number, i.name as instance_name FROM conversations c JOIN contacts ct ON c.contact_id = ct.id JOIN instances i ON c.instance_id = i.id ORDER BY c.last_message_at DESC LIMIT 10"
```

### 5. Ver Mensagens

```bash
npm run query:sqlite "SELECT id, conversation_id, body, sent_by, created_at FROM messages ORDER BY created_at DESC LIMIT 20"
```

### 6. Contar Registros

```bash
npm run query:sqlite "SELECT COUNT(*) as total FROM instances"
```

### 7. Estatísticas por Status

```bash
npm run query:sqlite "SELECT status, COUNT(*) as total FROM conversations GROUP BY status"
```

### 8. Ver Produtos

```bash
npm run query:sqlite "SELECT id, name, price, description FROM products"
```

### 9. Ver Contatos

```bash
npm run query:sqlite "SELECT id, name, phone_number, account_id FROM contacts"
```

## 🔧 Outras Formas de Acessar

### Via SQLite CLI (Linha de Comando)

**Windows:**
```bash
# Instalar SQLite (se não tiver)
# Baixe de: https://www.sqlite.org/download.html
# Ou use: choco install sqlite

# Abrir o banco
sqlite3 data/whatsapp.db

# Dentro do SQLite CLI:
.tables                    # Listar tabelas
.schema instances          # Ver estrutura da tabela
SELECT * FROM instances;   # Executar query
.quit                      # Sair
```

**Linux/Mac:**
```bash
# Instalar (se necessário)
sudo apt-get install sqlite3  # Ubuntu/Debian
brew install sqlite3          # Mac

# Abrir o banco
sqlite3 data/whatsapp.db
```

### Via Ferramentas Gráficas

#### DB Browser for SQLite (Recomendado)
1. **Download**: https://sqlitebrowser.org/
2. **Abrir**: File → Open Database → `data/whatsapp.db`
3. **Executar queries**: Aba "Execute SQL"

#### DBeaver (Multi-banco)
1. **Download**: https://dbeaver.io/
2. **Conexão**: New Database Connection → SQLite
3. **Path**: `C:\Workspace\whatsapp-evolution-api\data\whatsapp.db`

### Via Código TypeScript

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'whatsapp.db'));

// Executar SELECT
const stmt = db.prepare('SELECT * FROM instances WHERE status = ?');
const instances = stmt.all('connected');

console.log(instances);

db.close();
```

## 📊 Queries Úteis por Tabela

### Instâncias (instances)

```sql
-- Todas as instâncias
SELECT * FROM instances;

-- Instâncias conectadas
SELECT * FROM instances WHERE status = 'connected';

-- Instâncias por conta
SELECT account_id, COUNT(*) as total 
FROM instances 
GROUP BY account_id;

-- Instâncias com QR Code
SELECT id, name, status, 
       CASE WHEN qr_code IS NOT NULL THEN 'Sim' ELSE 'Não' END as tem_qr_code
FROM instances;
```

### Contatos (contacts)

```sql
-- Todos os contatos
SELECT * FROM contacts;

-- Contatos com nome
SELECT * FROM contacts WHERE name IS NOT NULL;

-- Contatos por conta
SELECT account_id, COUNT(*) as total_contatos
FROM contacts
GROUP BY account_id;

-- Buscar contato por telefone
SELECT * FROM contacts WHERE phone_number = '+5511999999999';
```

### Conversas (conversations)

```sql
-- Todas as conversas
SELECT * FROM conversations;

-- Conversas por status
SELECT status, COUNT(*) as total
FROM conversations
GROUP BY status;

-- Conversas recentes
SELECT * FROM conversations 
ORDER BY last_message_at DESC 
LIMIT 10;

-- Conversas aguardando agente
SELECT * FROM conversations WHERE status = 'waiting_agent';

-- Conversas com detalhes completos
SELECT 
  c.id,
  c.status,
  c.last_message_at,
  c.bot_handoff_count,
  ct.name as contact_name,
  ct.phone_number,
  i.name as instance_name,
  i.status as instance_status
FROM conversations c
JOIN contacts ct ON c.contact_id = ct.id
JOIN instances i ON c.instance_id = i.id
ORDER BY c.last_message_at DESC;
```

### Mensagens (messages)

```sql
-- Todas as mensagens
SELECT * FROM messages;

-- Mensagens recentes
SELECT * FROM messages 
ORDER BY created_at DESC 
LIMIT 20;

-- Mensagens por tipo
SELECT sent_by, COUNT(*) as total
FROM messages
GROUP BY sent_by;

-- Mensagens de uma conversa específica
SELECT * FROM messages 
WHERE conversation_id = 'id-da-conversa'
ORDER BY created_at ASC;

-- Contar mensagens por conversa
SELECT 
  conversation_id,
  COUNT(*) as total_messages,
  SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as enviadas,
  SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as recebidas
FROM messages
GROUP BY conversation_id;
```

### Produtos (products)

```sql
-- Todos os produtos
SELECT * FROM products;

-- Produtos por conta
SELECT * FROM products WHERE account_id = 'id-da-conta';

-- Produtos ordenados por preço
SELECT * FROM products ORDER BY price DESC;

-- Produtos com imagem
SELECT * FROM products WHERE image_url IS NOT NULL;

-- Estatísticas de produtos
SELECT 
  account_id,
  COUNT(*) as total_produtos,
  AVG(price) as preco_medio,
  MIN(price) as preco_minimo,
  MAX(price) as preco_maximo
FROM products
GROUP BY account_id;
```

## 🔍 Queries Avançadas

### Relatório Completo de Conversas

```sql
SELECT 
  c.id as conversation_id,
  c.status,
  c.last_message_at,
  ct.name as contact_name,
  ct.phone_number,
  i.name as instance_name,
  (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as total_messages,
  (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.id) as ultima_mensagem
FROM conversations c
JOIN contacts ct ON c.contact_id = ct.id
JOIN instances i ON c.instance_id = i.id
ORDER BY c.last_message_at DESC;
```

### Estatísticas Gerais do Sistema

```sql
SELECT 
  'Instâncias' as tipo,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) as conectadas
FROM instances
UNION ALL
SELECT 
  'Conversas',
  COUNT(*),
  SUM(CASE WHEN status = 'in_service' THEN 1 ELSE 0 END)
FROM conversations
UNION ALL
SELECT 
  'Mensagens',
  COUNT(*),
  SUM(CASE WHEN sent_by = 'customer' THEN 1 ELSE 0 END)
FROM messages
UNION ALL
SELECT 
  'Contatos',
  COUNT(*),
  COUNT(DISTINCT account_id)
FROM contacts
UNION ALL
SELECT 
  'Produtos',
  COUNT(*),
  COUNT(DISTINCT account_id)
FROM products;
```

### Buscar Conversas com Última Mensagem

```sql
SELECT 
  c.id,
  c.status,
  c.last_message_at,
  ct.name as contact_name,
  m.body as ultima_mensagem,
  m.sent_by as ultima_mensagem_de,
  m.created_at as ultima_mensagem_data
FROM conversations c
JOIN contacts ct ON c.contact_id = ct.id
LEFT JOIN messages m ON m.id = (
  SELECT id FROM messages 
  WHERE conversation_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY c.last_message_at DESC;
```

## 💡 Dicas

1. **Use LIMIT** para não sobrecarregar com muitos resultados:
   ```sql
   SELECT * FROM messages LIMIT 100;
   ```

2. **Use WHERE** para filtrar resultados:
   ```sql
   SELECT * FROM instances WHERE status = 'connected';
   ```

3. **Use ORDER BY** para ordenar:
   ```sql
   SELECT * FROM conversations ORDER BY last_message_at DESC;
   ```

4. **Use JOIN** para combinar dados de várias tabelas:
   ```sql
   SELECT c.*, ct.name, i.name 
   FROM conversations c
   JOIN contacts ct ON c.contact_id = ct.id
   JOIN instances i ON c.instance_id = i.id;
   ```

5. **Use COUNT, SUM, AVG** para estatísticas:
   ```sql
   SELECT 
     COUNT(*) as total,
     AVG(price) as preco_medio
   FROM products;
   ```

## ⚠️ Importante

- O script `query:sqlite` só permite **SELECT** (somente leitura)
- Para INSERT, UPDATE ou DELETE, use o `sqliteService` no código ou ferramentas externas
- Sempre faça backup antes de fazer alterações manuais
- Use aspas simples para strings em SQL: `WHERE status = 'connected'`

## 🆘 Problemas Comuns

### "no such table"
```bash
# Execute o teste para criar as tabelas
npm run test:sqlite
```

### "database is locked"
- Feche outras conexões ao banco
- Aguarde alguns segundos e tente novamente

### Query muito lenta
- Adicione índices nas colunas usadas em WHERE
- Use LIMIT para limitar resultados
- Verifique se há muitos registros na tabela

