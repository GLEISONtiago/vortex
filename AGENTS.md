# VÓRTEX — Canal Seguro GCMJP

## Objetivo

O Vórtex é um sistema web de recebimento, acompanhamento e gestão de denúncias e informações destinadas à Guarda Civil Municipal de João Pessoa (GCMJP).

O projeto deve começar simples, rápido e funcional, mas com arquitetura preparada para futuras integrações com o ecossistema da GCMJP.

## Stack

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Storage
- Leaflet/OpenStreetMap
- GitHub
- Vercel

## Arquitetura

O Vórtex deve permanecer em repositório próprio.

Repositório:

https://github.com/GLEISONtiago/vortex

Inicialmente o Vórtex será uma aplicação independente.

Posteriormente poderá ser integrado ao GCM Diário e a outros sistemas da GCMJP.

## MVP

O primeiro MVP deve conter:

### Área pública

- Página inicial
- Apresentação do Vórtex
- Nova denúncia
- Categorias de denúncia
- Descrição da ocorrência
- Data e horário
- Endereço
- Localização no mapa
- Nível de urgência
- Possibilidade de denúncia anônima
- Upload de fotos e vídeos
- Geração de protocolo
- Código de acompanhamento

### Acompanhamento

O cidadão poderá consultar uma denúncia usando:

- Protocolo
- Código de acompanhamento

Deve visualizar:

- Status
- Data de registro
- Histórico permitido
- Eventuais mensagens da GCMJP

### Área GCMJP

Deve possuir:

- Login
- Dashboard
- Lista de denúncias
- Filtros
- Pesquisa
- Visualização detalhada
- Mapa
- Alteração de status
- Registro de providências
- Histórico/auditoria

## Fluxo inicial

Uma denúncia poderá seguir:

NOVA
→ EM ANÁLISE
→ ENCAMINHADA
→ EM ATENDIMENTO
→ CONCLUÍDA

Também poderá ser marcada como:

IMPROCEDENTE

## Banco de dados

Os recursos específicos do Vórtex devem utilizar nomes com prefixo `vortex_`.

Exemplos:

- vortex_profiles
- vortex_categories
- vortex_reports
- vortex_attachments
- vortex_report_history
- vortex_messages

NÃO alterar, excluir, renomear ou migrar tabelas existentes do GCM Diário sem autorização explícita.

## Segurança

- Nunca colocar senhas ou chaves secretas no código.
- Nunca colocar arquivos `.env` no Git.
- Utilizar variáveis de ambiente.
- Utilizar Row Level Security (RLS) no Supabase.
- Aplicar princípio do menor privilégio.
- Anexos de denúncias não devem ser públicos por padrão.
- Dados do denunciante devem ser tratados como sensíveis.
- Alterações relevantes devem gerar histórico/auditoria.

## Interface

Idioma:

Português brasileiro.

Nome do sistema:

VÓRTEX

Subtítulo:

Canal Seguro GCMJP

A identidade visual deve ser própria da GCMJP.

Não copiar literalmente identidade visual, textos, imagens, código ou marca de terceiros.

O design deve ser:

- institucional
- moderno
- limpo
- responsivo
- acessível
- simples de utilizar
- adequado para celular

## Desenvolvimento

Priorizar uma versão funcional pequena.

Não implementar integrações complexas no MVP.

Não implementar funcionalidades não solicitadas apenas por iniciativa própria.

Antes de alterações estruturais importantes, explicar o impacto.

Não remover funcionalidades existentes sem autorização.

Sempre preservar compatibilidade com o restante do projeto.

## Integrações futuras

O projeto poderá futuramente integrar:

- GCM Diário
- GCM App
- equipes
- viaturas
- Traccar
- despacho/CAD
- sistemas institucionais autorizados
- mapas operacionais
- relatórios estatísticos

Essas integrações devem ser implementadas de forma modular.