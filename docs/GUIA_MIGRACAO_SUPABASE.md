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
3. Execute o script

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

