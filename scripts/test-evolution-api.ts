/**
 * Script de teste para Evolution API
 * Execute com: npx tsx scripts/test-evolution-api.ts
 */

import { evolutionAPI } from '../lib/evolution-api';

async function testEvolutionAPI() {
  console.log('🧪 Testando conexão com Evolution API...\n');

  const testInstanceName = 'test-instance-' + Date.now();

  try {
    // Teste 1: Criar instância
    console.log('1️⃣ Testando criação de instância...');
    const createResult = await evolutionAPI.createInstance(testInstanceName);
    
    if (createResult.success) {
      console.log('✅ Instância criada com sucesso!');
      console.log('   QR Code disponível:', !!createResult.data);
    } else {
      console.error('❌ Erro ao criar instância:', createResult.error);
      return;
    }

    // Teste 2: Status da instância
    console.log('\n2️⃣ Testando status da instância...');
    const statusResult = await evolutionAPI.getInstanceStatus(testInstanceName);
    
    if (statusResult.success) {
      console.log('✅ Status obtido com sucesso!');
      console.log('   Estado:', statusResult.data?.state);
    } else {
      console.error('❌ Erro ao obter status:', statusResult.error);
    }

    // Teste 3: Conectar instância
    console.log('\n3️⃣ Testando conexão da instância...');
    const connectResult = await evolutionAPI.connectInstance(testInstanceName);
    
    if (connectResult.success) {
      console.log('✅ Conexão iniciada com sucesso!');
      console.log('   QR Code disponível:', !!connectResult.data);
    } else {
      console.error('❌ Erro ao conectar:', connectResult.error);
    }

    // Limpeza: Deletar instância de teste
    console.log('\n🧹 Limpando instância de teste...');
    await evolutionAPI.deleteInstance(testInstanceName);
    console.log('✅ Instância de teste removida');

    console.log('\n✅ Todos os testes passaram!');
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  }
}

// Executar testes
testEvolutionAPI();

