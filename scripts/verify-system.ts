/**
 * Script para verificar o banco de dados SQLite e testar as APIs
 * Execute com: npx tsx scripts/verify-system.ts
 */

import { sqliteService } from '../lib/services/sqlite-service';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'whatsapp.db');

interface TableStats {
  name: string;
  count: number;
  sample?: any[];
}

async function verifyDatabase() {
  console.log('📊 VERIFICANDO BANCO DE DADOS SQLite\n');
  console.log('─'.repeat(60));

  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    // Listar todas as tabelas
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];

    console.log(`\n✅ Banco de dados encontrado: ${DB_PATH}`);
    console.log(`📋 Tabelas encontradas: ${tables.length}\n`);

    const stats: TableStats[] = [];

    for (const table of tables) {
      try {
        const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`);
        const countResult = countStmt.get() as { count: number };
        const count = countResult.count;

        let sample: any[] = [];
        if (count > 0) {
          const sampleStmt = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`);
          sample = sampleStmt.all() as any[];
        }

        stats.push({
          name: table.name,
          count,
          sample: count > 0 ? sample : undefined,
        });
      } catch (error: any) {
        console.error(`   ❌ Erro ao verificar tabela ${table.name}:`, error.message);
      }
    }

    // Exibir estatísticas
    console.log('📈 ESTATÍSTICAS DAS TABELAS:\n');
    for (const stat of stats) {
      const icon = stat.count > 0 ? '✅' : '📭';
      console.log(`${icon} ${stat.name.padEnd(20)} : ${stat.count.toString().padStart(5)} registro(s)`);
      
      if (stat.sample && stat.sample.length > 0) {
        console.log(`   └─ Exemplo:`);
        const first = stat.sample[0];
        const keys = Object.keys(first).slice(0, 5); // Mostrar apenas 5 primeiras colunas
        const preview = keys.map(k => `${k}: ${String(first[k]).substring(0, 30)}`).join(', ');
        console.log(`      ${preview}${keys.length < Object.keys(first).length ? '...' : ''}`);
      }
    }

    // Estatísticas detalhadas
    console.log('\n\n📊 ESTATÍSTICAS DETALHADAS:\n');

    // Instâncias por status
    try {
      const instancesByStatus = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM instances 
        GROUP BY status
      `).all() as { status: string; count: number }[];
      
      if (instancesByStatus.length > 0) {
        console.log('📱 Instâncias por status:');
        instancesByStatus.forEach(({ status, count }) => {
          console.log(`   ${status.padEnd(15)} : ${count}`);
        });
      }
    } catch (error) {
      // Ignorar se não houver dados
    }

    // Conversas por status
    try {
      const conversationsByStatus = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM conversations 
        GROUP BY status
      `).all() as { status: string; count: number }[];
      
      if (conversationsByStatus.length > 0) {
        console.log('\n💬 Conversas por status:');
        conversationsByStatus.forEach(({ status, count }) => {
          console.log(`   ${status.padEnd(15)} : ${count}`);
        });
      }
    } catch (error) {
      // Ignorar se não houver dados
    }

    // Mensagens por tipo
    try {
      const messagesByType = db.prepare(`
        SELECT sent_by, COUNT(*) as count 
        FROM messages 
        GROUP BY sent_by
      `).all() as { sent_by: string; count: number }[];
      
      if (messagesByType.length > 0) {
        console.log('\n📨 Mensagens por tipo:');
        messagesByType.forEach(({ sent_by, count }) => {
          console.log(`   ${sent_by.padEnd(15)} : ${count}`);
        });
      }
    } catch (error) {
      // Ignorar se não houver dados
    }

    // Produtos por conta
    try {
      const productsByAccount = db.prepare(`
        SELECT account_id, COUNT(*) as count 
        FROM products 
        GROUP BY account_id
      `).all() as { account_id: string; count: number }[];
      
      if (productsByAccount.length > 0) {
        console.log('\n🛍️  Produtos por conta:');
        productsByAccount.forEach(({ account_id, count }) => {
          console.log(`   ${account_id.substring(0, 20).padEnd(20)} : ${count}`);
        });
      }
    } catch (error) {
      // Ignorar se não houver dados
    }

    db.close();
    return true;
  } catch (error: any) {
    console.error('\n❌ Erro ao verificar banco de dados:', error.message);
    return false;
  }
}

async function testAPIs() {
  console.log('\n\n🌐 TESTANDO APIs\n');
  console.log('─'.repeat(60));

  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
  const results: { name: string; status: 'success' | 'error' | 'skipped'; message: string }[] = [];

  // Teste 1: Health Check
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    if (response.ok) {
      results.push({ name: 'Health Check', status: 'success', message: 'API está respondendo' });
    } else {
      results.push({ name: 'Health Check', status: 'error', message: `Status: ${response.status}` });
    }
  } catch (error: any) {
    results.push({ name: 'Health Check', status: 'error', message: `Erro: ${error.message}` });
  }

  // Teste 2: Test Conversations (rota de teste sem autenticação)
  try {
    const response = await fetch(`${baseUrl}/api/test/conversations`);
    if (response.ok) {
      const data = await response.json();
      results.push({ 
        name: 'Test Conversations', 
        status: 'success', 
        message: `${data.count || 0} conversa(s) encontrada(s)` 
      });
    } else {
      results.push({ name: 'Test Conversations', status: 'error', message: `Status: ${response.status}` });
    }
  } catch (error: any) {
    results.push({ name: 'Test Conversations', status: 'skipped', message: 'Servidor não está rodando' });
  }

  // Teste 3: Test Instance Status (rota de teste)
  try {
    // Primeiro, buscar uma instância do banco
    const db = new Database(DB_PATH, { readonly: true });
    const instance = db.prepare('SELECT name FROM instances LIMIT 1').get() as { name: string } | undefined;
    db.close();

    if (instance) {
      const response = await fetch(`${baseUrl}/api/test/instance/status?instanceName=${instance.name}`);
      if (response.ok) {
        const data = await response.json();
        results.push({ 
          name: 'Test Instance Status', 
          status: 'success', 
          message: `Instância: ${data.status || 'N/A'}` 
        });
      } else {
        results.push({ name: 'Test Instance Status', status: 'error', message: `Status: ${response.status}` });
      }
    } else {
      results.push({ name: 'Test Instance Status', status: 'skipped', message: 'Nenhuma instância no banco' });
    }
  } catch (error: any) {
    results.push({ name: 'Test Instance Status', status: 'skipped', message: 'Servidor não está rodando' });
  }

  // Exibir resultados
  console.log('\n📋 RESULTADOS DOS TESTES:\n');
  for (const result of results) {
    const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name.padEnd(25)} : ${result.message}`);
  }

  return results;
}

async function showQuickQueries() {
  console.log('\n\n🔍 QUERIES RÁPIDAS DISPONÍVEIS\n');
  console.log('─'.repeat(60));
  console.log('\nExecute estas queries para ver dados específicos:\n');
  
  console.log('📱 Ver todas as instâncias:');
  console.log('   npm run query:sqlite "SELECT id, name, status, phone_number FROM instances"');
  
  console.log('\n💬 Ver conversas recentes:');
  console.log('   npm run query:sqlite "SELECT id, status, last_message_at FROM conversations ORDER BY last_message_at DESC LIMIT 10"');
  
  console.log('\n📨 Ver mensagens:');
  console.log('   npm run query:sqlite "SELECT id, conversation_id, body, sent_by, created_at FROM messages ORDER BY created_at DESC LIMIT 10"');
  
  console.log('\n🛍️  Ver produtos:');
  console.log('   npm run query:sqlite "SELECT id, name, price, account_id FROM products"');
  
  console.log('\n👥 Ver contatos:');
  console.log('   npm run query:sqlite "SELECT id, name, phone_number, account_id FROM contacts"');
}

async function main() {
  console.log('🔍 VERIFICAÇÃO DO SISTEMA\n');
  console.log('═'.repeat(60));
  
  const dbOk = await verifyDatabase();
  const apiResults = await testAPIs();
  
  console.log('\n\n📊 RESUMO\n');
  console.log('─'.repeat(60));
  console.log(`✅ Banco de dados: ${dbOk ? 'OK' : 'ERRO'}`);
  
  const apiSuccess = apiResults.filter(r => r.status === 'success').length;
  const apiTotal = apiResults.filter(r => r.status !== 'skipped').length;
  console.log(`✅ APIs testadas: ${apiSuccess}/${apiTotal} ${apiTotal > 0 ? 'sucesso(s)' : '(servidor não está rodando)'}`);
  
  if (apiTotal === 0) {
    console.log('\n💡 Dica: Inicie o servidor com "npm run dev" para testar as APIs');
  }
  
  await showQuickQueries();
  
  console.log('\n\n✅ Verificação concluída!\n');
}

main().catch(console.error);

