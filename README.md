# VÓRTEX — Canal Seguro GCMJP

Aplicação web para recebimento, acompanhamento e gestão de denúncias e informações destinadas à Guarda Civil Municipal de João Pessoa (GCMJP).

O VÓRTEX prioriza uma experiência pública simples, acessível e segura, com uma área administrativa preparada para o tratamento institucional dos registros.

## Recursos

### Área pública

- Página institucional responsiva.
- Envio anônimo de denúncias em etapas.
- Categorias carregadas do Supabase.
- CEP com preenchimento assistido por ViaCEP.
- Seleção de localização com Leaflet e OpenStreetMap.
- Anexos de imagens e vídeos por URLs pré-assinadas para bucket privado S3/MinIO.
- Protocolo gerado no banco e PIN numérico definido pelo cidadão.
- Acompanhamento público por protocolo e PIN.

### Área administrativa

- Autenticação de equipe e perfis institucionais.
- Consulta e gestão de denúncias.
- Alteração de status, histórico e atribuição de responsável.
- Gestão administrativa de usuários.

## Tecnologias

- [Next.js 16](https://nextjs.org/) com App Router
- React 19 e TypeScript
- Tailwind CSS 4
- Supabase e PostgreSQL com Row Level Security (RLS)
- Leaflet e OpenStreetMap
- AWS SDK compatível com S3/MinIO

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Projeto Supabase configurado
- Bucket S3/MinIO privado para anexos, quando o recurso estiver habilitado

## Execução local

```bash
git clone https://github.com/GLEISONtiago/vortex.git
cd vortex
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Em sistemas Unix, substitua o comando de cópia por:

```bash
cp .env.example .env.local
```

## Variáveis de ambiente

Crie `.env.local` a partir de `.env.example`. Nunca versione esse arquivo nem exponha chaves de servidor.

| Variável | Uso | Visibilidade |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable do Supabase | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Operações server-side autorizadas | Secreta |
| `S3_ENDPOINT` | Endpoint HTTPS do armazenamento compatível com S3 | Secreta |
| `S3_REGION` | Região configurada no armazenamento | Secreta |
| `S3_BUCKET` | Nome do bucket privado de anexos | Secreta |
| `S3_ACCESS_KEY` | Credencial S3/MinIO do servidor | Secreta |
| `S3_SECRET_KEY` | Credencial S3/MinIO do servidor | Secreta |
| `S3_FORCE_PATH_STYLE` | Define uso de path-style (`true` ou `false`) | Secreta |

`SUPABASE_SERVICE_ROLE_KEY` e as credenciais S3 nunca devem usar o prefixo `NEXT_PUBLIC_`.

## Banco de dados

As migrations estão em [`supabase/migrations`](supabase/migrations). Elas devem ser revisadas e aplicadas no projeto Supabase correto, em ordem numérica, antes de habilitar os fluxos que dependem delas.

As migrations atuais incluem a estrutura inicial, envio público, administração, PIN de acompanhamento, sessões de upload temporárias e acompanhamento por protocolo + PIN.

> A aplicação não executa migrations automaticamente. Não aplique uma migration em produção sem revisão e backup adequados.

## Anexos

Os anexos não são armazenados no PostgreSQL. O fluxo utiliza sessões temporárias no Supabase e URLs pré-assinadas de curta duração para enviar objetos a um bucket privado.

- Máximo de 5 anexos por denúncia.
- Imagens JPEG, PNG e WebP: até 10 MB.
- Vídeos MP4, WebM e QuickTime: até 50 MB.
- O nome original do arquivo não é usado como chave de armazenamento.
- A confirmação do arquivo ocorre somente após validação server-side dos metadados do objeto.

Para produção, o endpoint S3 deve aceitar os métodos e headers necessários para `PUT` pré-assinado. Configurações de CORS e proxy do armazenamento pertencem à infraestrutura e não são gerenciadas por esta aplicação.

## Qualidade

```bash
npm run lint
npm run build
```

## Segurança

- Acesso a dados protegido por RLS e funções SQL com privilégio mínimo.
- Dados públicos são gravados exclusivamente por RPCs controladas.
- O acompanhamento público requer protocolo e PIN; o PIN é armazenado somente em hash.
- Bucket de anexos permanece privado; downloads administrativos usam URLs assinadas de curta duração.
- Não armazene secrets, tokens de sessão ou chaves de acesso no repositório, browser ou logs.

## Estrutura do projeto

```text
app/                  Rotas e componentes do Next.js
app/api/storage/      Endpoints server-side para anexos
lib/supabase/         Clientes Supabase para browser e servidor
lib/storage/          Cliente S3/MinIO e validações de anexo
supabase/migrations/  Evolução versionada do banco de dados
docs/                 Documentação complementar
```

## Contribuição

1. Crie uma branch a partir de `main`.
2. Mantenha as alterações pequenas e focadas.
3. Execute lint e build antes de abrir uma solicitação de mudança.
4. Nunca inclua arquivos `.env`, credenciais, tokens ou dados reais de denúncias.

## Licença

Este projeto é de uso institucional da Guarda Civil Municipal de João Pessoa. Todos os direitos reservados.
