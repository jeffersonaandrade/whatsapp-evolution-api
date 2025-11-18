# Guia: Configurar e Usar Evolution API com WhatsApp

Este guia explica como configurar e testar a integração com o Evolution API para conectar WhatsApp, incluindo uso via frontend (Dashboard) e testes técnicos (cURL/Postman).

## 📋 Pré-requisitos

1. **Evolution API instalada e rodando**
   - Docker: `docker-compose up -d` (usa `docker-compose.yml`)
   - Ou instalação manual: [Documentação Evolution API](https://doc.evolution-api.com/)

2. **URL e API Key do Evolution API**
   - URL: geralmente `http://localhost:8080` (local) ou `https://seu-servidor.com` (produção)
   - API Key: gerada na configuração do Evolution API

## 🚀 Passo 1: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env.local`:

```env
# Evolution API
NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key-aqui

# Webhook (URL do seu projeto Next.js)
WEBHOOK_URL=http://localhost:3000/api/webhook
WEBHOOK_SECRET=sua-chave-secreta-webhook

# Supabase (Opcional - por enquanto usamos mock)
USE_MOCK_SUPABASE=true

# Projeto Cérebro (Opcional - para quando tiver o projeto cérebro)
# BRAIN_WEBHOOK_URL=http://localhost:4000/api/webhook
# BRAIN_WEBHOOK_SECRET=sua-chave-secreta
```

**Importante:**
- `NEXT_PUBLIC_EVOLUTION_API_URL`: URL pública do Evolution API (acessível pelo navegador)
- `EVOLUTION_API_KEY`: Chave de API do Evolution API (apenas no servidor - **nunca exponha no frontend**)

### 1.1. Verificar Configuração

O sistema detecta automaticamente se o Evolution API está configurado:

- ✅ **Configurado**: Usa Evolution API real
- ❌ **Não configurado**: Usa mock (para desenvolvimento)

Você pode verificar isso nos logs do servidor:
```bash
[Evolution API] Usando Evolution API REAL
# ou
[Evolution API] Usando Evolution API MOCKADO
```

## 🐳 Passo 2: Iniciar Evolution API

### Opção 1: Teste Local (Docker - Recomendado)

**2.1. Iniciar Evolution API:**

```bash
docker-compose up -d
```

Ou, se preferir rodar diretamente sem docker-compose:

```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-api-key-aqui \
  atendai/evolution-api:latest
```

**2.2. Configurar variáveis de ambiente:**

```env
NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key-aqui
```

**2.3. Reiniciar o servidor Next.js:**

```bash
npm run dev
```

**2.4. Verificar se está rodando:**

```bash
docker ps
```

Você deve ver o container `evolution-api` rodando.

**2.5. Ver logs (opcional):**

```bash
docker-compose logs -f evolution-api
# ou
docker logs evolution-api -f
```

### Opção 2: Teste com Evolution API em Servidor

Se você já tem a Evolution API rodando em outro servidor (ex: Render.com):

**2.1. Configurar variáveis:**

```env
NEXT_PUBLIC_EVOLUTION_API_URL=https://seu-servidor-evolution.com
EVOLUTION_API_KEY=sua-api-key-aqui
```

**2.2. Testar conexão:**

```bash
curl -X GET https://seu-servidor-evolution.com/instance/fetchInstances \
  -H "apikey: sua-api-key-aqui"
```

## ✅ Passo 3: Testar a Conexão

### 3.1. Testar no Dashboard (Frontend)

1. **Acesse o Dashboard:**
   ```
   http://localhost:3000/dashboard
   ```

2. **Faça login** (se necessário)

3. **Clique em "Conectar Agora"** ou botão equivalente

4. **Escaneie o QR Code** com seu WhatsApp:
   - Abra WhatsApp no celular
   - Vá em **Configurações** > **Aparelhos conectados** > **Conectar um aparelho**
   - Escaneie o QR Code exibido no dashboard

5. **Aguarde a conexão:**
   - O dashboard deve atualizar automaticamente mostrando "Conectado"
   - O número do WhatsApp deve aparecer

### 3.2. Testar via cURL (Backend/Técnico)

**Verificar se Evolution API está respondendo:**

```bash
curl http://localhost:8080
```

Ou acesse: http://localhost:8080

Deve retornar informações da API.

**Testar criação de instância (via rota de teste):**

```bash
curl -X POST http://localhost:3000/api/test/instance/connect \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "minha-instancia-1"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "instanceName": "minha-instancia-1",
  "instanceId": "instance-...",
  "message": "Escaneie o QR Code com o WhatsApp"
}
```

⚠️ **Nota:** As rotas `/api/test/*` são apenas para desenvolvimento. Em produção, use `/api/instance/*` com autenticação adequada.

## 📡 Passo 4: Endpoints Utilizados

O sistema usa os seguintes endpoints do Evolution API:

### 4.1. Criar Instância

```
POST /instance/create
Body: { instanceName: string, qrcode: true }
```

### 4.2. Conectar e Obter QR Code

```
GET /instance/connect/{instanceName}
```

### 4.3. Verificar Status

```
GET /instance/connectionState/{instanceName}
```

### 4.4. Desconectar

```
DELETE /instance/logout/{instanceName}
```

## 🧪 Passo 5: Teste Manual via cURL

### 5.1. Criar Instância

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: sua-api-key" \
  -d '{
    "instanceName": "teste-instance",
    "qrcode": true
  }'
```

### 5.2. Obter QR Code

```bash
curl -X GET http://localhost:8080/instance/connect/teste-instance \
  -H "apikey: sua-api-key"
```

### 5.3. Verificar Status

```bash
curl -X GET http://localhost:8080/instance/connectionState/teste-instance \
  -H "apikey: sua-api-key"
```

## 📱 Passo 6: Conectar WhatsApp (Frontend)

### 6.1. Fluxo no Dashboard

1. **Usuário clica em "Conectar"**
   - Frontend chama `/api/instance/connect`
   - Backend cria instância no Evolution API
   - Backend obtém QR Code
   - Backend salva instância no Supabase

2. **QR Code é exibido**
   - Usuário escaneia com WhatsApp
   - Evolution API detecta conexão
   - Webhook atualiza status no Supabase

3. **Status é verificado**
   - Frontend verifica status a cada 3 segundos
   - Quando conectado, mostra número do WhatsApp

### 6.2. Escanear QR Code

1. Abra WhatsApp no celular
2. Vá em **Configurações** > **Aparelhos conectados** > **Conectar um aparelho**
3. Escaneie o QR Code retornado pela API

Vamos criar uma rota de teste temporária para facilitar o desenvolvimento:

### 4.1. Criar rota de teste

Crie o arquivo `app/api/test/instance/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Rota de TESTE - Conectar instância WhatsApp (SEM autenticação)
 * ⚠️ REMOVER EM PRODUÇÃO
 */
export async function POST(request: NextRequest) {
  try {
    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: 'instanceName é obrigatório' },
        { status: 400 }
      );
    }

    // Criar instância na Evolution API
    const result = await evolutionAPI.createInstance(instanceName);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao criar instância', details: result.error },
        { status: 500 }
      );
    }

    // Salvar instância no mock (ou Supabase se configurado)
    // Para teste, vamos usar um account_id mockado
    const mockAccountId = 'test-account-1';
    
    const instance = await supabaseService.createInstance({
      account_id: mockAccountId,
      name: instanceName,
      status: 'connecting',
    });

    if (!instance) {
      console.error('Erro ao salvar instância no banco');
      // Tenta deletar a instância na Evolution API
      await evolutionAPI.deleteInstance(instanceName);
      return NextResponse.json(
        { error: 'Erro ao salvar instância no banco de dados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qrCode: result.data?.base64 || result.data?.code,
      instanceName,
      instanceId: instance.id,
      message: 'Escaneie o QR Code com o WhatsApp',
    });
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### 4.2. Testar a rota

```bash
curl -X POST http://localhost:3000/api/test/instance/connect \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "minha-instancia-1"}'
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

### 6.3. Verificar Status

Após escanear, você pode verificar o status:

**Via API de teste:**
```bash
curl "http://localhost:3000/api/test/instance/status?instanceName=minha-instancia-1"
```

**Via Evolution API direto:**
```bash
curl -X GET http://localhost:8080/instance/connectionState/minha-instancia-1 \
  -H "apikey: sua-api-key"
```

## 🔔 Passo 7: Testar Webhook

### 6.1. Enviar mensagem de teste

Após conectar o WhatsApp, envie uma mensagem para o número conectado.

### 6.2. Verificar logs

Os logs do Next.js devem mostrar:

```
[Webhook] Evento recebido: messages.upsert
[Webhook] Instância encontrada: minha-instancia-1
[Webhook] Evento repassado com sucesso para projeto cérebro
```

### 6.3. Verificar dados no mock

Os dados devem estar salvos no mock. Você pode criar uma rota de teste para listar:

```typescript
// app/api/test/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/services/supabase-service';

export async function GET() {
  const conversations = await supabaseService.getConversations('test-account-1');
  return NextResponse.json({ conversations });
}
```

## 📝 Passo 8: Enviar Mensagem

### 7.1. Criar rota de teste para enviar mensagem

```typescript
// app/api/test/message/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';

export async function POST(request: NextRequest) {
  try {
    const { instanceName, number, text } = await request.json();

    if (!instanceName || !number || !text) {
      return NextResponse.json(
        { error: 'instanceName, number e text são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await evolutionAPI.sendTextMessage(instanceName, number, text);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao enviar mensagem', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### 7.2. Testar envio

```bash
curl -X POST http://localhost:3000/api/test/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "minha-instancia-1",
    "number": "5511999999999",
    "text": "Olá! Esta é uma mensagem de teste."
  }'
```

**Nota**: Use o número completo com código do país (ex: `5511999999999` para Brasil).

## 🛑 Passo 9: Parar Evolution API

Quando não precisar mais:

```bash
docker-compose down
```

Para parar e remover volumes (apaga dados):

```bash
docker-compose down -v
```

## 🔍 Debugging

### Verificar Logs

1. **Logs do Next.js:**

```bash
# No terminal onde o servidor está rodando
# Procure por mensagens como:
[Evolution API] Criando instância: instance-xxx
[Evolution API] Erro ao criar instância: ...
```

2. **Logs do Evolution API:**

```bash
# Se estiver usando Docker
docker logs evolution-api -f
# ou
docker-compose logs -f evolution-api
```

## 🐛 Troubleshooting

### Erros Comuns

#### 1. "Erro ao criar instância"

- ✅ Verifique se o Evolution API está rodando
- ✅ Verifique se a URL está correta
- ✅ Verifique se a API Key está correta

#### 2. "QR Code não aparece"

- ✅ Verifique os logs do Evolution API
- ✅ Verifique se o endpoint `/instance/connect` está funcionando
- ✅ Teste diretamente: `curl http://localhost:8080/instance/connect/teste`

#### 3. "CORS Error"

- ✅ Configure CORS no Evolution API
- ✅ Ou use um proxy reverso (Nginx, etc.)

### Evolução API com Supabase (Session Pooler) travando em migrations

Quando usamos o Supabase no plano Free com o **session pooler** (`aws-*-pooler.supabase.com:6543`), o Evolution API tenta rodar ~50 migrations com Prisma na primeira inicialização. O pooler não mantém conexões longas e a instalação fica presa no log `prisma migrate deploy`.

**Como resolver (passo a passo)**

1. **Criar schema dedicado**
   1. Abra o SQL Editor do Supabase.
   2. Execute `create schema if not exists evolution;`
   3. Confirme em `information_schema.schemata` que o schema apareceu.
2. **Aplicar migrations manualmente**
   1. Baixe o repositório `EvolutionAPI/evolution-api` ou entre no container e copie os arquivos de `prisma/postgresql-migrations`.
   2. Para cada pasta numerada (ex.: `20240609...`), abra o arquivo `migration.sql`.
   3. Cole e execute o SQL no editor do Supabase com o schema `evolution` selecionado. Faça isso na ordem indicada pelo prefixo numérico.
   4. Após a última migration, rode:
      ```sql
      select table_schema, table_name
      from information_schema.tables
      where table_schema = 'evolution'
      order by table_name;
      ```
      Deve listar todas as tabelas (`instances`, `messages`, etc.).
3. **Configurar a string de conexão**
   1. Use o session pooler:  
      `postgresql://postgres.<project-id>:<SENHA>@aws-*-pooler.supabase.com:6543/postgres?schema=evolution&sslmode=require`
   2. Preencha o `<project-id>` e a senha corretos.
   3. No `.env`, ajuste `DATABASE_CONNECTION_URI` para essa string.
4. **Subir novamente o docker**
   - `docker-compose down`
   - `docker-compose up -d`
   - O log agora deve pular a etapa de migrations e iniciar o servidor em segundos.

> ✅ Depois desse “baseline” manual, qualquer máquina (dev ou produção) consegue subir o Evolution API com o Supabase Free usando apenas o session pooler.

## 📝 Notas Importantes

1. **Multi-tenancy**: Cada `account_id` tem sua própria instância
   - Nome da instância: `instance-{accountId}`
   - Exemplo: `instance-00000000-0000-0000-0000-000000000001`

2. **Webhook**: Configure o webhook do Evolution API para:
   - URL: `https://seu-dominio.com/api/webhook`
   - Eventos: `messages.upsert`, `connection.update`, `qrcode.update`

3. **Segurança**: 
   - Nunca exponha a `EVOLUTION_API_KEY` no frontend
   - Use HTTPS em produção
   - Configure CORS adequadamente

## 🔄 Fluxo Completo

1. **Usuário clica em "Conectar"**
   - Frontend chama `/api/instance/connect`
   - Backend cria instância no Evolution API
   - Backend obtém QR Code
   - Backend salva instância no Supabase

2. **QR Code é exibido**
   - Usuário escaneia com WhatsApp
   - Evolution API detecta conexão
   - Webhook atualiza status no Supabase

3. **Status é verificado**
   - Frontend verifica status a cada 3 segundos
   - Quando conectado, mostra número do WhatsApp

## 📚 Recursos

- [Documentação Evolution API](https://doc.evolution-api.com/)
- [GitHub Evolution API](https://github.com/EvolutionAPI/evolution-api)
- [Docker Hub](https://hub.docker.com/r/atendai/evolution-api)

## 📚 Próximos Passos

1. ✅ Evolution API configurada e rodando
2. ✅ WhatsApp conectado
3. ✅ Webhook recebendo eventos
4. ⏭️ Integrar com projeto cérebro (quando estiver pronto)
5. ⏭️ Configurar Supabase real (quando necessário)
6. ⏭️ Implementar autenticação nas rotas de produção

## 🔒 Segurança

⚠️ **IMPORTANTE**: 
- As rotas de teste (`/api/test/*`) devem ser **removidas em produção** ou protegidas com autenticação adequada
- Nunca exponha `EVOLUTION_API_KEY` no frontend
- Use HTTPS em produção
- Configure CORS adequadamente

