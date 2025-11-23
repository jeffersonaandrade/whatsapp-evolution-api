/**
 * Teste de integração: Evolution API + SQLite
 * Execute com: npx tsx scripts/test-integration.ts
 */

import { evolutionAPI } from '../lib/evolution-api';
import { sqliteService } from '../lib/services/sqlite-service';
import type { Instance } from '../types';

async function run() {
  console.log('🧪 Iniciando teste de integração (Evolution API + SQLite)...\n');

  const accountId = `test-account-${Date.now()}`;
  const instanceName = `instance-${accountId.replace(/-/g, '')}`;

  try {
    // Limpeza prévia: tentar deletar instância na Evolution API (ignorar erros)
    await evolutionAPI.deleteInstance(instanceName);

    // 1) Criar registro da instância no SQLite como "connecting"
    console.log('1️⃣ Criando registro local da instância (SQLite)...');
    const localInstance: Omit<Instance, 'id' | 'created_at' | 'updated_at'> = {
      account_id: accountId,
      name: instanceName,
      status: 'connecting',
    };
    const created = await sqliteService.createInstance(localInstance);
    console.log('   ✅ Criado no SQLite:', created.id);

    // 2) Criar instância na Evolution API
    console.log('\n2️⃣ Criando instância na Evolution API...');
    const createRes = await evolutionAPI.createInstance(instanceName);
    if (!createRes.success) {
      throw new Error(`Falha ao criar instância na Evolution API: ${createRes.error}`);
    }
    const initialQR = createRes.data?.base64 || createRes.data?.code || null;
    console.log('   ✅ Instância criada. QR disponível:', !!initialQR);

    // 3) Solicitar conexão/QR Code (caso não tenha vindo na criação)
    console.log('\n3️⃣ Obtendo QR Code via connect...');
    const connectRes = await evolutionAPI.connectInstance(instanceName);
    if (!connectRes.success) {
      throw new Error(`Falha ao conectar instância: ${connectRes.error}`);
    }
    const qrCode = connectRes.data?.base64 || connectRes.data?.code || initialQR || null;
    console.log('   ✅ QR Code obtido:', !!qrCode);

    // 4) Persistir QR e status no SQLite
    console.log('\n4️⃣ Atualizando registro local com QR Code e status connecting...');
    const updated = await sqliteService.updateInstance(created.id, {
      status: 'connecting',
      qr_code: qrCode || undefined,
    });
    if (!updated) throw new Error('Falha ao atualizar instância local');
    console.log('   ✅ Registro local atualizado');

    // 5) Verificar status da Evolution API
    console.log('\n5️⃣ Verificando status na Evolution API...');
    const statusRes = await evolutionAPI.getInstanceStatus(instanceName);
    if (!statusRes.success) {
      throw new Error(`Falha ao obter status: ${statusRes.error}`);
    }
    console.log('   ✅ Evolution state:', statusRes.data?.state || 'unknown');

    // 6) Confirmar que registro local permanece consistente
    console.log('\n6️⃣ Validando consistência local...');
    const local = await sqliteService.getInstanceById(created.id);
    if (!local) throw new Error('Instância local não encontrada após update');
    if (local.status !== 'connecting') throw new Error(`Status local inesperado: ${local.status}`);
    console.log('   ✅ Registro local consistente');

    console.log('\n✅ Teste de integração concluído com sucesso!');
  } catch (err: any) {
    console.error('\n❌ Falha no teste de integração:', err?.message || err);
    process.exit(1);
  } finally {
    // Limpeza
    try {
      await evolutionAPI.deleteInstance(instanceName);
    } catch {}
    sqliteService.close();
  }
}

run();


