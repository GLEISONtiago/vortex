# Backup administrativo do VÓRTEX

## Formato v2

Cada ZIP gerado pelo painel contém:

- `ABRIR-BACKUP.html`: painel offline para consulta após extrair o ZIP.
- `assets/backup.css`: estilos locais, sem dependências externas.
- `manifesto.json`: identifica o formato e as denúncias da parte.
- `indice.json`: índice resumido.
- `denuncias/ANO/PROTOCOLO/index.html`: visualização estruturada da denúncia.
- `denuncia.json`: dados necessários para restauração.
- `historico.json`, `mensagens.json` e `atribuicoes.json`.
- `anexos/`: imagens existentes no Storage no momento do backup.

O ZIP deve ser preservado no formato original. O restaurador lê o arquivo localmente no navegador e aceita o ZIP original produzido pelo VÓRTEX.

## Restauração

A restauração é exclusiva do perfil ADMIN.

- Se a denúncia ainda existe, seus dados atuais não são sobrescritos. Apenas anexos ausentes podem ser reidratados.
- Se a denúncia não existe e o backup é v2, o sistema recria o registro preservando protocolo, datas, status, resultado, histórico, mensagens e atribuições válidas.
- Imagens são enviadas diretamente ao Supabase Storage por URL de upload assinada; não atravessam o corpo da Function da Vercel.
- Cada restauração concluída gera evento `BACKUP_RESTORED` na auditoria.

Backups anteriores ao v2 podem ser usados para recuperar anexos de denúncias ainda existentes, mas não possuem todos os metadados necessários para recriar com segurança uma denúncia apagada.
