# 📚 Índice de Documentação

## 🎯 Documentação Principal

### 1. **ARQUITETURA_ATUAL.md** ⭐ **LEIA PRIMEIRO**
- Arquitetura atual do sistema (motor vs cérebro)
- Divisão de responsabilidades
- Fluxos de comunicação
- APIs disponíveis
- Pontos de atenção

**Quando ler:** Antes de fazer qualquer mudança no projeto

### 2. **GUIA_INICIO_DESENVOLVIMENTO.md** 🚀
- Passos para iniciar o desenvolvimento
- Checklist de configuração inicial
- Estrutura do projeto
- Comandos de desenvolvimento
- Troubleshooting

**Quando ler:** Ao iniciar o desenvolvimento ou configurar o ambiente

### 3. **CHECKLIST_DESENVOLVIMENTO.md** ✅
- Checklist completo de desenvolvimento
- Funcionalidades implementadas
- Testes necessários
- Segurança
- Deploy

**Quando ler:** Durante o desenvolvimento para acompanhar progresso

---

## 📖 Documentação de Referência

### 4. **ARQUITETURA_BACKEND.md**
- Arquitetura completa do backend
- **⚠️ Pode estar desatualizada** - Verificar com ARQUITETURA_ATUAL.md

### 5. **ESPECIFICACAO_TECNICA_BACKEND.md**
- Especificação técnica detalhada
- Endpoints da Evolution API
- Endpoints do backend
- Fluxos de integração
- **⚠️ Pode estar desatualizada** - Verificar com ARQUITETURA_ATUAL.md

### 6. **GUIA_RAPIDO_BACKEND.md**
- Guia rápido para desenvolvedores
- **⚠️ Pode estar desatualizada** - Verificar com ARQUITETURA_ATUAL.md

### 7. **RESUMO_BACKEND.md**
- Resumo executivo
- **⚠️ Pode estar desatualizada** - Verificar com ARQUITETURA_ATUAL.md

---

## 🎯 Quando Usar Cada Documento

### Antes de Fazer Mudanças
1. Ler **ARQUITETURA_ATUAL.md** para entender a arquitetura
2. Verificar se a mudança não quebra a separação motor/cérebro
3. Consultar **CHECKLIST_DESENVOLVIMENTO.md** para verificar o que já está implementado

### Ao Iniciar Desenvolvimento
1. Ler **GUIA_INICIO_DESENVOLVIMENTO.md** para configurar o ambiente
2. Seguir o checklist de configuração inicial
3. Consultar **ARQUITETURA_ATUAL.md** para entender a arquitetura

### Durante o Desenvolvimento
1. Consultar **CHECKLIST_DESENVOLVIMENTO.md** para acompanhar progresso
2. Consultar **ARQUITETURA_ATUAL.md** antes de adicionar novas funcionalidades
3. Consultar **ESPECIFICACAO_TECNICA_BACKEND.md** para detalhes técnicos

### Ao Fazer Deploy
1. Consultar **CHECKLIST_DESENVOLVIMENTO.md** para verificar itens de deploy
2. Verificar variáveis de ambiente
3. Testar integração com projeto cérebro

---

## ⚠️ Documentos Desatualizados

Os seguintes documentos podem estar desatualizados após a separação motor/cérebro:

- `ARQUITETURA_BACKEND.md` - Pode conter referências à lógica de IA
- `ESPECIFICACAO_TECNICA_BACKEND.md` - Pode conter referências à lógica de IA
- `GUIA_RAPIDO_BACKEND.md` - Pode conter referências à lógica de IA
- `RESUMO_BACKEND.md` - Pode conter referências à lógica de IA

**Sempre verificar com `ARQUITETURA_ATUAL.md` antes de seguir essas documentações.**

---

## 📝 Estrutura da Documentação

```
docs/
├── ARQUITETURA_ATUAL.md              ⭐ LEIA PRIMEIRO
├── GUIA_INICIO_DESENVOLVIMENTO.md    🚀 Início rápido
├── CHECKLIST_DESENVOLVIMENTO.md      ✅ Checklist
├── INDICE_DOCUMENTACAO.md            📚 Este arquivo
├── ARQUITETURA_BACKEND.md            ⚠️ Pode estar desatualizada
├── ESPECIFICACAO_TECNICA_BACKEND.md  ⚠️ Pode estar desatualizada
├── GUIA_RAPIDO_BACKEND.md            ⚠️ Pode estar desatualizada
└── RESUMO_BACKEND.md                 ⚠️ Pode estar desatualizada
```

---

## 🔄 Atualização da Documentação

### Quando Atualizar

- **ARQUITETURA_ATUAL.md**: Sempre que houver mudança na arquitetura
- **GUIA_INICIO_DESENVOLVIMENTO.md**: Quando houver mudança no processo de setup
- **CHECKLIST_DESENVOLVIMENTO.md**: Quando houver mudança nas funcionalidades

### Como Atualizar

1. Verificar se a mudança quebra a separação motor/cérebro
2. Atualizar **ARQUITETURA_ATUAL.md** primeiro
3. Atualizar outros documentos conforme necessário
4. Marcar documentos desatualizados com ⚠️

---

**Última atualização:** 2024
**Versão:** 1.0

