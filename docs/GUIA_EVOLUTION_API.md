# Guia: Configurar e Usar Evolution API com WhatsApp

Este guia mostra como configurar e usar a Evolution API para conectar com WhatsApp Web.

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Node.js e npm instalados
- Projeto Next.js rodando (já está funcionando! ✅)

## 🚀 Passo 1: Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Evolution API
NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-secreta-aqui

# Webhook (URL do seu projeto Next.js)
WEBHOOK_URL=http://localhost:3000/api/webhook
WEBHOOK_SECRET=sua-chave-secreta-webhook

# Supabase (Opcional - por enquanto usamos mock)
USE_MOCK_SUPABASE=true

# Projeto Cérebro (Opcional - para quando tiver o projeto cérebro)
# BRAIN_WEBHOOK_URL=http://localhost:4000/api/webhook
# BRAIN_WEBHOOK_SECRET=sua-chave-secreta
```

**Importante**: 
- `EVOLUTION_API_KEY`: Use uma chave secreta forte (ex: `minha-chave-super-secreta-123`)
- `WEBHOOK_SECRET`: Use outra chave secreta (ex: `webhook-secret-456`)

## 🐳 Passo 2: Iniciar Evolution API com Docker

### 2.1. Iniciar o Container

No terminal, na raiz do projeto, execute:

```bash
docker-compose up -d
```

Isso vai:
- Baixar a imagem da Evolution API
- Iniciar o container na porta 8080
- Configurar os webhooks automaticamente

### 2.2. Verificar se está rodando

```bash
docker ps
```

Você deve ver o container `evolution-api` rodando.

### 2.3. Ver logs (opcional)

```bash
docker-compose logs -f evolution-api
```

## ✅ Passo 3: Testar a Conexão

### 3.1. Verificar se Evolution API está respondendo

Abra no navegador ou use curl:

```bash
curl http://localhost:8080
```

Ou acesse: http://localhost:8080

Deve retornar informações da API.

### 3.2. Testar criação de instância (via API do projeto)

Com o servidor Next.js rodando (`npm run dev`), você pode testar criando uma instância:

```bash
curl -X POST http://localhost:3000/api/instance/connect \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "minha-instancia-1"}'
```

**Nota**: Esta rota requer autenticação. Por enquanto, vamos criar uma rota de teste sem autenticação.

## 🔧 Passo 4: Criar Rota de Teste (Sem Autenticação)

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

## 📱 Passo 5: Conectar WhatsApp

### 5.1. Obter QR Code

Use a rota de teste acima para obter o QR Code.

### 5.2. Escanear QR Code

1. Abra o WhatsApp no celular
2. Vá em **Configurações** > **Aparelhos conectados** > **Conectar um aparelho**
3. Escaneie o QR Code retornado pela API

### 5.3. Verificar Status

Após escanear, você pode verificar o status:

```bash
curl "http://localhost:3000/api/instance/status?instanceName=minha-instancia-1"
```

Ou criar uma rota de teste:

```typescript
// app/api/test/instance/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { supabaseService } from '@/lib/services/supabase-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const instanceName = searchParams.get('instanceName');

  if (!instanceName) {
    return NextResponse.json(
      { error: 'instanceName é obrigatório' },
      { status: 400 }
    );
  }

  const instance = await supabaseService.getInstanceByName(instanceName);
  const evolutionStatus = await evolutionAPI.getInstanceStatus(instanceName);

  return NextResponse.json({
    instance: instance || null,
    evolutionState: evolutionStatus.data?.state,
    status: instance?.status || 'not_found',
  });
}
```

## 🔔 Passo 6: Testar Webhook

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

## 📝 Passo 7: Enviar Mensagem

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

## 🛑 Passo 8: Parar Evolution API

Quando não precisar mais:

```bash
docker-compose down
```

Para parar e remover volumes (apaga dados):

```bash
docker-compose down -v
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to Evolution API"

- Verifique se o Docker está rodando: `docker ps`
- Verifique se o container está ativo: `docker-compose ps`
- Verifique os logs: `docker-compose logs evolution-api`

### Erro: "Invalid API Key"

- Verifique se `EVOLUTION_API_KEY` no `.env.local` é igual ao `API_KEY` no `docker-compose.yml`
- Reinicie o container: `docker-compose restart`

### QR Code não aparece

- Verifique se a Evolution API está respondendo: `curl http://localhost:8080`
- Verifique os logs do container
- Tente criar uma nova instância com outro nome

### Webhook não recebe eventos

- Verifique se `WEBHOOK_URL` no `docker-compose.yml` está correto
- Verifique se o servidor Next.js está rodando
- Verifique os logs do Next.js

## 📚 Próximos Passos

1. ✅ Evolution API configurada e rodando
2. ✅ WhatsApp conectado
3. ✅ Webhook recebendo eventos
4. ⏭️ Integrar com projeto cérebro (quando estiver pronto)
5. ⏭️ Configurar Supabase real (quando necessário)
6. ⏭️ Implementar autenticação nas rotas de produção

## 🔒 Segurança

⚠️ **IMPORTANTE**: As rotas de teste (`/api/test/*`) devem ser **removidas em produção** ou protegidas com autenticação adequada.

