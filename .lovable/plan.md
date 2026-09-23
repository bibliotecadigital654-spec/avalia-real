# Mural de tarefas parametrizado

## Alterações
- Ler a URL-base do mural pela configuração segura `MURAL_OFERTAS_URL` no servidor.
- Montar a URL preservando parâmetros existentes e anexando dinamicamente o identificador do usuário autenticado.
- Manter o mural centralizado e embutido na página interna, com estados de carregamento e configuração indisponível.
- Manter a conversão do webhook configurável, usando R$ 3,00 como taxa padrão por unidade recebida.

## Detalhes técnicos
- O parâmetro de rastreamento será inferido pela URL configurada: `subid` quando ela já usar esse padrão; caso contrário, `uid`.
- A URL final será validada como HTTPS antes de ser enviada à página.
- O webhook continuará validando assinatura e bloqueando créditos duplicados antes de atualizar carteira e extrato.

## Validação
- Conferir tipagem e carregamento da página interna.
- Confirmar que o iframe recebe o ID do usuário e que a taxa padrão permanece em 3.
