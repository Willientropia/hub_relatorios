# Assets

Esta pasta contém os recursos da aplicação como:

- **icon.png** - Ícone principal da aplicação (recomendado: 256x256px)
- **logo.svg** - Logo da aplicação em formato vetorial
- **images/** - Subpasta para outras imagens

## Formatos recomendados:

- **Ícones**: PNG com transparência (16x16, 32x32, 48x48, 256x256)
- **Logos**: SVG para escalabilidade
- **Imagens**: PNG ou JPG otimizadas

## Exemplo de uso no Electron:

```javascript
// No main.js
icon: path.join(__dirname, 'assets', 'icon.png')
```
