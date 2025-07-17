# Hub de Monitoramento

Aplicação de gestão de clientes solares desenvolvida com Electron, React e Firebase.

## 📁 Estrutura do Projeto (Refatorada)

```
src/
├── main/
│   └── main.js              # Processo principal do Electron
├── preload/
│   └── preload.js           # Script de segurança/ponte
└── renderer/
    ├── index.html           # HTML principal
    ├── index.js             # Entry point do React
    ├── App.jsx              # Componente principal
    ├── components/
    │   ├── Dashboard.jsx
    │   ├── ClientView.jsx
    │   ├── ClientCard.jsx
    │   ├── ClientDetailModal.jsx
    │   ├── ImportView.jsx
    │   ├── Tab.jsx
    │   ├── StatCard.jsx
    │   └── FilterButton.jsx
    ├── services/
    │   └── firebase.js      # Configuração Firebase
    └── styles/
        └── globals.css      # Estilos globais
```

## Configuração do Ambiente

### Pré-requisitos
- Node.js (versão 16.x ou superior)
- npm (versão 8.x ou superior)

### Instalação

1. Clone o repositório:
```
git clone [URL_DO_REPOSITORIO]
cd hub_monitoramento
```

2. Instale as dependências:
```
npm install
```

3. Construa os arquivos CSS:
```
npm run build-css
```

## Desenvolvimento

Para iniciar a aplicação em modo de desenvolvimento:
```
npm start
```

Para compilar o CSS automaticamente quando houver mudanças:
```
npm run watch-css
```

## Produção

Para gerar o executável para Windows:
```
npm run build-win
```

## Problemas Comuns e Soluções

### Erro de Tailwind CSS
Se estiver vendo avisos do Tailwind CSS sobre não usar em produção:
1. Execute `npm run build-css` para gerar o arquivo CSS compilado
2. Substitua a importação do CDN no index.html pela importação do arquivo local

### Erro com Babel
Se ocorrerem problemas com a transformação do código React:
1. Verifique se a sintaxe JSX está correta
2. Confirme se as dependências do Babel estão instaladas corretamente

### Problema de Conexão com Firebase
Se houver problemas de conexão com o Firebase:
1. Verifique a configuração do firebaseConfig no index.html
2. Certifique-se de que as regras de segurança do Firebase permitem acesso aos dados

## ⚡ Melhorias da Refatoração

### ✅ **Organização**
- **Componentes separados**: Cada componente tem seu próprio arquivo
- **Estrutura modular**: Separação clara entre main, preload e renderer
- **Reutilização**: Componentes isolados e reutilizáveis

### ✅ **Manutenibilidade**
- **Código limpo**: Fácil de encontrar e editar componentes específicos
- **Responsabilidades claras**: Cada arquivo tem uma função específica
- **Escalabilidade**: Fácil adicionar novos componentes

### ✅ **Developer Experience**
- **Navegação melhor**: Encontrar código específico é mais rápido
- **Debugging**: Erros apontam para arquivos específicos
- **Legibilidade**: Componentes menores e mais focados

## 🚀 **Funcionamento**

A aplicação mantém **exatamente as mesmas funcionalidades**:

1. **Dashboard** - Visão geral dos clientes e estatísticas
2. **Gestão de Clientes** - Listagem, filtros e detalhes
3. **Importação** - Upload de planilhas Excel
4. **Sistema de Status** - Gerenciamento de garantias e serviços
5. **Histórico** - Log de atividades por cliente

## 🔄 **Mudanças na Refatoração**

### **Antes** (Arquivo único):
- Todo código React em `src/index.html` (700+ linhas)
- Componentes misturados em um arquivo
- Difícil manutenção e navegação

### **Depois** (Estrutura modular):
- Componentes separados em arquivos individuais
- Estrutura organizada por responsabilidade
- Fácil manutenção e escalabilidade

### **Mantido Exatamente**:
- ✅ Todas as funcionalidades
- ✅ Interface idêntica
- ✅ Configuração Firebase
- ✅ Sistema de autenticação
- ✅ Importação de planilhas
- ✅ Gestão de status
- ✅ Histórico de atividades

## 🎨 **Tecnologias**

- **Electron** - Aplicação desktop
- **React** - Interface de usuário (via CDN + Babel)
- **Firebase Firestore** - Banco de dados em tempo real
- **Tailwind CSS** - Framework de estilização
- **XLSX** - Importação de planilhas Excel

## 📝 **Próximos Passos Recomendados**

1. **Migrar para bundler** (Webpack/Vite) para melhor performance
2. **Adicionar TypeScript** para type safety
3. **Implementar testes** automatizados
4. **Hot reload** para desenvolvimento mais ágil
5. **Build otimizado** para produção
