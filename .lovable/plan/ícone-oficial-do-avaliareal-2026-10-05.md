# Ícone oficial do AvaliaReal

## Objetivo
Criar uma identidade de aplicativo consistente com o visual Ultra Dark existente e garantir que o símbolo correto apareça no navegador e ao instalar o app no Android ou iPhone.

## Alterações
- Criar um componente reutilizável de logotipo em SVG: círculo preto profundo, aro discreto e símbolo central minimalista em verde neon.
- Substituir as marcas “AR” do cabeçalho público e da área interna pelo novo símbolo.
- Criar os arquivos públicos do ícone em SVG e versões quadradas próprias para 180, 192 e 512 pixels.
- Adicionar um manifesto web com nome, nome curto, cores do aplicativo, modo standalone e ícones de 192 e 512 pixels.
- Configurar favicon, Apple Touch Icon e manifesto no cabeçalho global do aplicativo.
- Remover o favicon padrão antigo para evitar que navegadores ou atalhos mostrem a marca anterior.

## Validação
- Confirmar que o manifesto e todos os ícones são servidos corretamente.
- Conferir visualmente a marca na página inicial e na área interna.
- Verificar a instalação em configurações equivalentes a celular e desktop, sem alterar regras de login, pagamentos ou tarefas.

## Detalhes técnicos
O projeto usa o cabeçalho global da aplicação para metadados; portanto, os vínculos de favicon e manifesto serão configurados ali, em vez de criar um `index.html` paralelo que entraria em conflito com a estrutura atual.
