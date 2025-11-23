/**
 * Script para executar queries SQL personalizadas no banco SQLite
 * Execute com: npx tsx scripts/query-sqlite.ts
 * 
 * Exemplo de uso:
 *   npx tsx scripts/query-sqlite.ts "SELECT * FROM instances LIMIT 5"
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'whatsapp.db');

function querySQLite(query: string) {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    // Verificar se é uma query SELECT (leitura)
    const isSelect = query.trim().toUpperCase().startsWith('SELECT');
    
    if (!isSelect) {
      console.error('⚠️  Este script só permite queries SELECT (somente leitura)');
      console.log('💡 Para queries de escrita, use o sqliteService ou ferramentas externas');
      db.close();
      return;
    }
    
    console.log(`📊 Executando query:\n${query}\n`);
    console.log('─'.repeat(50));
    
    const stmt = db.prepare(query);
    const rows = stmt.all() as any[];
    
    if (rows.length === 0) {
      console.log('📭 Nenhum resultado encontrado');
    } else {
      console.log(`✅ ${rows.length} resultado(s) encontrado(s):\n`);
      console.table(rows);
    }
    
    db.close();
  } catch (error: any) {
    console.error('❌ Erro ao executar query:', error.message);
    if (error.message.includes('no such table')) {
      console.log('\n💡 Dica: Verifique se o banco de dados foi inicializado');
      console.log('   Execute: npm run test:sqlite');
    }
    process.exit(1);
  }
}

// Obter query da linha de comando
const query = process.argv[2];

if (!query) {
  console.log('📝 Script para executar queries SQL no banco SQLite\n');
  console.log('Uso:');
  console.log('  npx tsx scripts/query-sqlite.ts "SELECT * FROM instances LIMIT 5"\n');
  console.log('Exemplos:');
  console.log('  npx tsx scripts/query-sqlite.ts "SELECT COUNT(*) as total FROM instances"');
  console.log('  npx tsx scripts/query-sqlite.ts "SELECT * FROM conversations WHERE status = \'bot\'"');
  console.log('  npx tsx scripts/query-sqlite.ts "SELECT name, status FROM instances"');
  process.exit(0);
}

querySQLite(query);

