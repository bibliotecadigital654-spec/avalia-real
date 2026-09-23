# Liberação temporária do paywall

## Alterações
- Fazer o hook de licença retornar imediatamente uma licença ativa para qualquer usuário, sem consultar ou acompanhar o banco enquanto a liberação temporária estiver vigente.
- Expor também os nomes solicitados `isAtivo: true` e `statusLicenca: "ativo"`, preservando o retorno atual para compatibilidade.
- Remover o `LicencaGate` do contêiner da área interna, mantendo somente a proteção normal de login.
- Preservar o código de cobrança e webhook para futura reativação, sem exibi-lo nem acioná-lo durante a auditoria.

## Validação
- Verificar os tipos do projeto.
- Confirmar que usuários autenticados abrem diretamente as páginas internas sem tela Pix.
