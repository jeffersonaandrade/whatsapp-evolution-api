/**
 * Script de teste para Supabase
 * Execute com: npx tsx scripts/test-supabase.ts
 */

import { createServerSupabase } from '../lib/supabase';

async function testSupabase() {
  console.log('🧪 Testando conexão com Supabase...\n');

  try {
    const supabase = createServerSupabase();

    // Teste 1: Verificar conexão
    console.log('1️⃣ Testando conexão com Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('accounts')
      .select('count')
      .limit(1);

    if (healthError) {
      console.error('❌ Erro ao conectar com Supabase:', healthError.message);
      console.log('\n💡 Dica: Verifique se:');
      console.log('   - As variáveis de ambiente estão configuradas');
      console.log('   - As tabelas foram criadas (SCRIPTS_SUPABASE.sql)');
      console.log('   - O Supabase está acessível');
      return;
    }

    console.log('✅ Conexão com Supabase OK!');

    // Teste 2: Verificar tabelas
    console.log('\n2️⃣ Verificando tabelas...');
    const tables = [
      'accounts',
      'users',
      'instances',
      'contacts',
      'conversations',
      'messages',
      'products',
      'groups',
      'campaigns',
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error) {
          console.log(`   ⚠️  Tabela "${table}" não encontrada ou sem acesso`);
        } else {
          console.log(`   ✅ Tabela "${table}" OK`);
        }
      } catch (err) {
        console.log(`   ❌ Erro ao verificar tabela "${table}"`);
      }
    }

    console.log('\n✅ Testes de Supabase concluídos!');
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  }
}

// Executar testes
testSupabase();

