const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o processo de renderização aqui
contextBridge.exposeInMainWorld('electronAPI', {
  // Exemplo de como expor métodos do IPC:
  send: (channel, data) => {
    // Lista de canais permitidos para envio
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    // Lista de canais permitidos para recepção
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      // Remover o ouvinte antigo para evitar duplicação
      ipcRenderer.removeAllListeners(channel);
      // Adicionar o novo ouvinte
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
