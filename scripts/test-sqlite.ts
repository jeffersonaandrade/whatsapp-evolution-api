/**
 * Script de teste para SQLite
 * Execute com: npx tsx scripts/test-sqlite.ts
 */

import { sqliteService } from '../lib/services/sqlite-service';
import type { Instance, Contact, Conversation, Message, Product } from '../types';

async function testSQLite() {
  console.log('🧪 Testando SQLite...\n');

  const testAccountId = 'test-account-' + Date.now();
  let testInstanceId: string;
  let testContactId: string;
  let testConversationId: string;
  let testMessageId: string;
  let testProductId: string;

  try {
    // Teste 1: Criar instância
    console.log('1️⃣ Testando criação de instância...');
    const instanceData: Omit<Instance, 'id' | 'created_at' | 'updated_at'> = {
      account_id: testAccountId,
      name: `test-instance-${Date.now()}`,
      status: 'disconnected',
    };
    const instance = await sqliteService.createInstance(instanceData);
    testInstanceId = instance.id;
    console.log(`   ✅ Instância criada: ${instance.id} (${instance.name})`);

    // Teste 2: Buscar instância por ID
    console.log('\n2️⃣ Testando busca de instância por ID...');
    const foundInstance = await sqliteService.getInstanceById(testInstanceId);
    if (foundInstance && foundInstance.id === testInstanceId) {
      console.log(`   ✅ Instância encontrada: ${foundInstance.name}`);
    } else {
      throw new Error('Instância não encontrada');
    }

    // Teste 3: Buscar instância por nome
    console.log('\n3️⃣ Testando busca de instância por nome...');
    const foundByName = await sqliteService.getInstanceByName(instance.name);
    if (foundByName && foundByName.id === testInstanceId) {
      console.log(`   ✅ Instância encontrada por nome: ${foundByName.name}`);
    } else {
      throw new Error('Instância não encontrada por nome');
    }

    // Teste 4: Buscar instância por accountId
    console.log('\n4️⃣ Testando busca de instância por accountId...');
    const foundByAccount = await sqliteService.getInstanceByAccountId(testAccountId);
    if (foundByAccount && foundByAccount.account_id === testAccountId) {
      console.log(`   ✅ Instância encontrada por accountId: ${foundByAccount.name}`);
    } else {
      throw new Error('Instância não encontrada por accountId');
    }

    // Teste 5: Atualizar instância
    console.log('\n5️⃣ Testando atualização de instância...');
    const updated = await sqliteService.updateInstance(testInstanceId, {
      status: 'connected',
      phone_number: '+5511999999999',
    });
    if (updated) {
      const updatedInstance = await sqliteService.getInstanceById(testInstanceId);
      if (updatedInstance?.status === 'connected') {
        console.log(`   ✅ Instância atualizada: status = ${updatedInstance.status}`);
      } else {
        throw new Error('Atualização não funcionou');
      }
    } else {
      throw new Error('Falha ao atualizar instância');
    }

    // Teste 6: Criar ou buscar contato
    console.log('\n6️⃣ Testando criação/busca de contato...');
    const contact = await sqliteService.findOrCreateContact(
      testAccountId,
      '+5511888888888',
      'Teste Contato'
    );
    testContactId = contact.id;
    console.log(`   ✅ Contato criado/encontrado: ${contact.id} (${contact.name})`);

    // Teste 7: Buscar contato existente
    console.log('\n7️⃣ Testando busca de contato existente...');
    const existingContact = await sqliteService.findOrCreateContact(
      testAccountId,
      '+5511888888888',
      'Teste Contato Atualizado'
    );
    if (existingContact.id === testContactId && existingContact.name === 'Teste Contato Atualizado') {
      console.log(`   ✅ Contato atualizado: ${existingContact.name}`);
    } else {
      throw new Error('Contato não foi atualizado corretamente');
    }

    // Teste 8: Criar ou buscar conversa
    console.log('\n8️⃣ Testando criação/busca de conversa...');
    const conversation = await sqliteService.findOrCreateConversation(
      testInstanceId,
      testContactId,
      testAccountId
    );
    testConversationId = conversation.id;
    console.log(`   ✅ Conversa criada/encontrada: ${conversation.id} (status: ${conversation.status})`);

    // Teste 9: Criar mensagem
    console.log('\n9️⃣ Testando criação de mensagem...');
    const messageData: Omit<Message, 'id' | 'created_at'> = {
      conversation_id: testConversationId,
      from_me: false,
      body: 'Mensagem de teste',
      timestamp: new Date().toISOString(),
      status: 'sent',
      sent_by: 'customer',
    };
    const message = await sqliteService.createMessage(messageData);
    testMessageId = message.id;
    console.log(`   ✅ Mensagem criada: ${message.id}`);

    // Teste 10: Buscar mensagens da conversa
    console.log('\n🔟 Testando busca de mensagens...');
    const messages = await sqliteService.getMessagesByConversation(testConversationId);
    if (messages.length > 0 && messages[0].id === testMessageId) {
      console.log(`   ✅ Mensagens encontradas: ${messages.length} mensagem(ns)`);
    } else {
      throw new Error('Mensagens não encontradas');
    }

    // Teste 11: Atualizar conversa
    console.log('\n1️⃣1️⃣ Testando atualização de conversa...');
    const conversationUpdated = await sqliteService.updateConversation(testConversationId, {
      status: 'waiting_agent',
      last_message_at: new Date().toISOString(),
    });
    if (conversationUpdated) {
      const updatedConv = await sqliteService.getConversationById(testConversationId);
      if (updatedConv?.status === 'waiting_agent') {
        console.log(`   ✅ Conversa atualizada: status = ${updatedConv.status}`);
      } else {
        throw new Error('Atualização não funcionou');
      }
    } else {
      throw new Error('Falha ao atualizar conversa');
    }

    // Teste 12: Buscar conversas
    console.log('\n1️⃣2️⃣ Testando busca de conversas...');
    const conversations = await sqliteService.getConversations({ accountId: testAccountId });
    if (conversations.length > 0) {
      console.log(`   ✅ Conversas encontradas: ${conversations.length} conversa(s)`);
    } else {
      throw new Error('Conversas não encontradas');
    }

    // Teste 13: Buscar conversa por ID
    console.log('\n1️⃣3️⃣ Testando busca de conversa por ID...');
    const foundConversation = await sqliteService.getConversationById(testConversationId);
    if (foundConversation && foundConversation.id === testConversationId) {
      console.log(`   ✅ Conversa encontrada: ${foundConversation.id}`);
    } else {
      throw new Error('Conversa não encontrada');
    }

    // Teste 14: Criar produto
    console.log('\n1️⃣4️⃣ Testando criação de produto...');
    const productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
      account_id: testAccountId,
      name: 'Produto Teste',
      description: 'Descrição do produto teste',
      price: 99.99,
    };
    const product = await sqliteService.createProduct(productData);
    testProductId = product.id;
    console.log(`   ✅ Produto criado: ${product.id} (${product.name})`);

    // Teste 15: Buscar produtos
    console.log('\n1️⃣5️⃣ Testando busca de produtos...');
    const products = await sqliteService.getProducts(testAccountId);
    if (products.length > 0 && products[0].id === testProductId) {
      console.log(`   ✅ Produtos encontrados: ${products.length} produto(s)`);
    } else {
      throw new Error('Produtos não encontrados');
    }

    // Teste 16: Buscar produto por ID
    console.log('\n1️⃣6️⃣ Testando busca de produto por ID...');
    const foundProduct = await sqliteService.getProductById(testProductId);
    if (foundProduct && foundProduct.id === testProductId) {
      console.log(`   ✅ Produto encontrado: ${foundProduct.name}`);
    } else {
      throw new Error('Produto não encontrado');
    }

    // Teste 17: Atualizar produto
    console.log('\n1️⃣7️⃣ Testando atualização de produto...');
    const productUpdated = await sqliteService.updateProduct(testProductId, {
      name: 'Produto Teste Atualizado',
      price: 149.99,
    });
    if (productUpdated) {
      const updatedProduct = await sqliteService.getProductById(testProductId);
      if (updatedProduct?.name === 'Produto Teste Atualizado' && updatedProduct.price === 149.99) {
        console.log(`   ✅ Produto atualizado: ${updatedProduct.name} (R$ ${updatedProduct.price})`);
      } else {
        throw new Error('Atualização não funcionou');
      }
    } else {
      throw new Error('Falha ao atualizar produto');
    }

    // Teste 18: Deletar produto
    console.log('\n1️⃣8️⃣ Testando deleção de produto...');
    const deleted = await sqliteService.deleteProduct(testProductId);
    if (deleted) {
      const deletedProduct = await sqliteService.getProductById(testProductId);
      if (!deletedProduct) {
        console.log(`   ✅ Produto deletado com sucesso`);
      } else {
        throw new Error('Produto não foi deletado');
      }
    } else {
      throw new Error('Falha ao deletar produto');
    }

    console.log('\n✅ Todos os testes passaram com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   - Instâncias: ✅`);
    console.log(`   - Contatos: ✅`);
    console.log(`   - Conversas: ✅`);
    console.log(`   - Mensagens: ✅`);
    console.log(`   - Produtos: ✅`);
  } catch (error: any) {
    console.error('\n❌ Erro durante os testes:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Fechar conexão
    sqliteService.close();
  }
}

// Executar testes
testSQLite();

