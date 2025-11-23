# Guia de Acesso ao Banco de Dados SQLite

O banco de dados SQLite está localizado em: `./data/whatsapp.db`

## 📍 Localização

Por padrão, o banco de dados é criado em:
- **Caminho padrão**: `./data/whatsapp.db`
- **Variável de ambiente**: `SQLITE_DB_PATH` (pode ser configurada no `.env.local`)

## 🔧 Formas de Acessar

### 1. Via Código (Já Implementado)

O projeto já tem um serviço que gerencia todas as operações:

```typescript
import { sqliteService } from '@/lib/services/sqlite-service';

// Exemplos de uso
const instance = await sqliteService.getInstanceById('id-da-instancia');
const conversations = await sqliteService.getConversations({ accountId: 'account-id' });
```

### 2. Via Linha de Comando (sqlite3)

#### Instalar SQLite CLI (se ainda não tiver)

**Windows:**
- Baixe de: https://www.sqlite.org/download.html
- Ou use via Chocolatey: `choco install sqlite`

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install sqlite3

# Mac (via Homebrew)
brew install sqlite3
```

#### Acessar o banco

```bash
# Navegar até o diretório do projeto
cd C:\Workspace\whatsapp-evolution-api

# Abrir o banco de dados
sqlite3 data/whatsapp.db
```

#### Comandos úteis no SQLite CLI

```sql
-- Listar todas as tabelas
.tables

-- Ver estrutura de uma tabela
.schema instances

-- Ver todas as instâncias
SELECT * FROM instances;

-- Ver conversas com status 'bot'
SELECT * FROM conversations WHERE status = 'bot';

-- Contar mensagens por conversa
SELECT conversation_id, COUNT(*) as total 
FROM messages 
GROUP BY conversation_id;

-- Sair do SQLite
.quit
```

### 3. Via Ferramentas Gráficas

#### DB Browser for SQLite (Recomendado)

1. **Download**: https://sqlitebrowser.org/
2. **Instalação**: Baixe e instale o executável
3. **Abrir banco**:
   - Abra o DB Browser
   - Clique em "Open Database"
   - Navegue até `C:\Workspace\whatsapp-evolution-api\data\whatsapp.db`

#### DBeaver (Multi-banco)

1. **Download**: https://dbeaver.io/
2. **Conexão**:
   - New Database Connection → SQLite
   - Path: `C:\Workspace\whatsapp-evolution-api\data\whatsapp.db`

#### VS Code Extensions

- **SQLite Viewer**: Extensão para visualizar arquivos `.db` diretamente no VS Code
- **SQLite**: Extensão para executar queries SQL no VS Code

### 4. Via Script Node.js

Use o script `scripts/query-sqlite.ts` (criado abaixo) para executar queries personalizadas.

## 📊 Estrutura das Tabelas

### Tabelas Principais

1. **instances** - Instâncias WhatsApp
   - `id`, `account_id`, `name`, `status`, `phone_number`, `profile_pic_url`, `qr_code`, `created_at`, `updated_at`

2. **contacts** - Contatos
   - `id`, `account_id`, `phone_number`, `name`, `profile_pic_url`, `tags`, `created_at`

3. **conversations** - Conversas
   - `id`, `instance_id`, `contact_id`, `status`, `assigned_to`, `last_message_at`, `transferred_at`, `transfer_reason`, `bot_handoff_count`, `created_at`, `updated_at`

4. **messages** - Mensagens
   - `id`, `conversation_id`, `from_me`, `body`, `timestamp`, `status`, `sent_by`, `agent_id`, `created_at`

5. **products** - Produtos
   - `id`, `account_id`, `name`, `description`, `price`, `image_url`, `created_at`, `updated_at`

## 🔍 Queries Úteis

### Ver todas as instâncias conectadas
```sql
SELECT id, name, status, phone_number, created_at 
FROM instances 
WHERE status = 'connected';
```

### Ver conversas recentes
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

### Contar mensagens por tipo
```sql
SELECT 
  sent_by,
  COUNT(*) as total
FROM messages
GROUP BY sent_by;
```

### Ver produtos de uma conta
```sql
SELECT 
  id,
  name,
  price,
  description,
  created_at
FROM products
WHERE account_id = 'seu-account-id'
ORDER BY created_at DESC;
```

## ⚠️ Importante

- **Backup**: Sempre faça backup do arquivo `whatsapp.db` antes de fazer alterações manuais
- **WAL Mode**: O banco usa WAL (Write-Ahead Logging), então você verá arquivos `.db-shm` e `.db-wal` também
- **Concorrência**: O SQLite suporta leituras concorrentes, mas apenas uma escrita por vez
- **Não edite manualmente**: Prefira usar o serviço `sqliteService` para garantir integridade dos dados

## 🧪 Testar Conexão

Execute o script de teste para validar o banco:

```bash
npm run test:sqlite
```

