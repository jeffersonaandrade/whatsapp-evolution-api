# Guia de Migração: Mock para Supabase Real

Este guia explica como migrar do Supabase mockado para o Supabase real quando você estiver pronto para configurar o banco de dados.

## Como Funciona o Sistema Mockado

O projeto está configurado para usar um serviço mockado quando o Supabase não estiver configurado. O sistema detecta automaticamente se deve usar mock ou Supabase real baseado nas variáveis de ambiente.

### Detecção Automática

O serviço `supabase-service.ts` verifica automaticamente:
- Se `USE_MOCK_SUPABASE=true` está definido, usa mock
- Se `NEXT_PUBLIC_SUPABASE_URL` não está definido, usa mock
- Caso contrário, usa Supabase real

## Configuração do Supabase Real

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote as credenciais:
   - Project URL
   - Anon Key
   - Service Role Key

### 2. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Desabilitar mock (opcional - será desabilitado automaticamente se Supabase estiver configurado)
USE_MOCK_SUPABASE=false
```

### 3. Executar Scripts SQL

Execute os scripts SQL do arquivo `SCRIPTS_SUPABASE.sql` no Supabase SQL Editor:

1. Acesse o SQL Editor no Supabase
2. Copie e cole o conteúdo de `SCRIPTS_SUPABASE.sql`
3. Execute o script completo

#### Script aplicado em 09/11/2025

> ✅ Projeto já executou o script abaixo diretamente no Supabase. Use-o como referência ou reaplique conforme necessário.

```sql
-- 1. Tabelas principais ------------------------------------------------------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table instances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null unique,
  status text default 'disconnected',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  phone_number text not null,
  display_name text,
  profile_pic_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (account_id, phone_number)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  instance_id uuid not null references instances(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  status text default 'open',
  last_message_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  from_me boolean not null default false,
  body text,
  media_url text,
  timestamp timestamptz not null,
  status text,
  sent_by text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2),
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Índices úteis -----------------------------------------------------------

create index idx_instances_account_id on instances(account_id);
create index idx_contacts_account_id on contacts(account_id);
create index idx_conversations_account_id on conversations(account_id);
create index idx_conversations_instance_id on conversations(instance_id);
create index idx_messages_conversation_id on messages(conversation_id);
create index idx_products_account_id on products(account_id);

-- 3. Habilitar Row Level Security -------------------------------------------

alter table accounts enable row level security;
alter table instances enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table products enable row level security;

-- 4. Policies básicas -------------------------------------------------------

create policy "select own accounts"
on accounts for select
using (auth.uid() = id);

create policy "select own instances"
on instances for select
using (account_id = auth.uid());

create policy "insert own instances"
on instances for insert
with check (account_id = auth.uid());

create policy "update own instances"
on instances for update
using (account_id = auth.uid())
with check (account_id = auth.uid());

create policy "select own contacts"
on contacts for select
using (account_id = auth.uid());

create policy "insert own contacts"
on contacts for insert
with check (account_id = auth.uid());

create policy "select own conversations"
on conversations for select
using (account_id = auth.uid());

create policy "insert own conversations"
on conversations for insert
with check (account_id = auth.uid());

create policy "select own messages"
on messages for select
using (
  conversation_id in (
    select id from conversations where account_id = auth.uid()
  )
);

create policy "insert own messages"
on messages for insert
with check (
  conversation_id in (
    select id from conversations where account_id = auth.uid()
  )
);

create policy "select own products"
on products for select
using (account_id = auth.uid());

create policy "insert own products"
on products for insert
with check (account_id = auth.uid());
```

### 4. Criar usuário inicial (Dashboard)

O Supabase não permite criar usuários de Auth via `auth.admin.create_user` diretamente no SQL. Para ter um usuário base:

1. Acesse **Auth → Users** no dashboard e clique em **+ Add user**
2. Informe:
   - Email: `admin@teste.com`
   - Senha: `Priscil@95`
   - Marque a opção para confirmar o e-mail (se disponível)
3. Após criar, copie o `User ID` (UUID) do usuário recém-criado

Com o `User ID` em mãos, vincule o usuário à conta padrão usando o SQL Editor:

```sql
insert into accounts (name)
values ('Conta Demo')
returning id;
```

```sql
insert into users (id, email, name, role, account_id)
values ('<uuid-do-auth-user>', 'admin@teste.com', 'Admin Demo', 'admin', '<id-retornado-no-insert-da-account>');
```

> ⚠️ Substitua cada `<uuid...>` pelos valores retornados nos passos anteriores. Para ambientes de produção troque a senha (`Priscil@95`) por uma credencial segura antes de compartilhar o acesso. Caso prefira automatizar a criação de usuários, utilize o Admin SDK (`supabase.auth.admin.createUser`) em código servidor com a `SUPABASE_SERVICE_ROLE_KEY`.

## Modo de Teste (Supabase sem Auth nem RLS)

Se o objetivo for apenas validar a comunicação com a Evolution API (webhooks, inserções básicas) sem lidar com RLS/Auth, use a configuração reduzida abaixo:

1. **Banco**
   - Rode apenas as `CREATE TABLE` e `CREATE INDEX` do `SCRIPTS_SUPABASE.sql`
   - **Não** habilite RLS por enquanto (pule as instruções `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
   - Opcional: deixe uma conta/usuário fixo inserido manualmente
2. **Variáveis `.env`**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   USE_MOCK_SUPABASE=false
   ```
   - Todas as rotas server-side vão usar o `Service Role` e, como o RLS está desligado, as operações funcionam sem autenticação de usuário.
3. **Fluxo de testes**
   - Suba o projeto (`npm run dev`) e a Evolution API
   - Crie uma instância via `/api/instance/connect`
   - Dispare eventos de webhook (ex.: `scripts/test-evolution-api.ts`) e verifique se tabelas recebem dados

> Quando quiser voltar ao cenário real, reabilite o RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), configure usuários em Auth e remova dados de teste se necessário.

### 4. Verificar Migração

Após configurar o Supabase:

1. Reinicie o servidor Next.js
2. O sistema automaticamente detectará o Supabase configurado
3. Todas as chamadas passarão a usar o Supabase real

## Estrutura do Serviço

O serviço `supabase-service.ts` atua como uma camada de abstração:

```typescript
// Usa mock ou Supabase real automaticamente
const instance = await supabaseService.getInstanceByName(instanceName);
const contact = await supabaseService.findOrCreateContact(accountId, phoneNumber, name);
```

## Dados Mockados

⚠️ **Importante**: Os dados mockados são armazenados apenas em memória e serão perdidos quando o servidor reiniciar.

Quando migrar para Supabase real:
- Todos os dados mockados serão perdidos
- Você precisará criar os dados novamente no Supabase
- Considere exportar dados mockados antes da migração (se necessário)

## Testando a Migração

### 1. Verificar se Mock está Ativo

Adicione logs temporários em `lib/services/supabase-service.ts`:

```typescript
const USE_MOCK = process.env.USE_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL;

if (USE_MOCK) {
  console.log('[Supabase] Usando serviço MOCKADO');
} else {
  console.log('[Supabase] Usando Supabase REAL');
}
```

### 2. Testar Operações Básicas

1. Criar uma instância
2. Receber uma mensagem via webhook
3. Verificar se os dados foram salvos no Supabase

### 3. Verificar no Supabase Dashboard

1. Acesse o Table Editor no Supabase
2. Verifique se as tabelas foram criadas
3. Confirme se os dados estão sendo salvos

## Troubleshooting

### Erro: "Supabase URL ou Anon Key não configurados"

- Verifique se as variáveis de ambiente estão definidas
- Reinicie o servidor após adicionar as variáveis

### Erro: "relation does not exist"

- Execute os scripts SQL do arquivo `SCRIPTS_SUPABASE.sql`
- Verifique se todas as tabelas foram criadas

### Dados não aparecem no Supabase

- Verifique os logs do servidor
- Confirme que `USE_MOCK_SUPABASE` não está definido como `true`
- Verifique as permissões RLS (Row Level Security) no Supabase

## Manter Mock para Desenvolvimento

Se quiser continuar usando mock durante desenvolvimento:

```env
USE_MOCK_SUPABASE=true
```

Isso força o uso do mock mesmo se o Supabase estiver configurado.

## Próximos Passos

Após migrar para Supabase real:

1. ✅ Configurar autenticação (Supabase Auth)
2. ✅ Configurar Row Level Security (RLS)
3. ✅ Configurar webhooks do Supabase (se necessário)
4. ✅ Configurar backups automáticos
5. ✅ Monitorar performance e custos

