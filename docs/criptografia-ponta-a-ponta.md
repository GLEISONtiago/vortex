# Plano de criptografia ponta a ponta do VÓRTEX

## Objetivo
Proteger o conteúdo sensível de denúncias de modo que Vercel, Supabase e o banco armazenem apenas ciphertext. A descriptografia deve acontecer no navegador de um usuário interno autorizado.

## Limite importante
E2EE protege conteúdo, não elimina metadados de rede. Provedores de hospedagem/API podem processar IP, user-agent, horário e outros metadados técnicos. A interface pública não deve prometer anonimato absoluto nem afirmar que nenhum IP existe na infraestrutura.

## Envelope por denúncia
1. O navegador do denunciante gera uma chave aleatória AES-256-GCM exclusiva da denúncia.
2. Descrição, endereço detalhado, ponto de referência, coordenadas e demais campos sensíveis são criptografados localmente, cada operação com IV único.
3. Imagens são comprimidas, metadados EXIF são removidos e os bytes são criptografados localmente antes do upload.
4. A chave AES da denúncia é encapsulada para chaves públicas institucionais/de usuários autorizados. A chave privada nunca deve existir no servidor em texto puro.
5. O banco mantém em claro apenas o mínimo necessário para roteamento e operação: protocolo, categoria, status, urgência, timestamps e identificadores técnicos.
6. Mensagens entre denunciante e equipe usam a mesma chave da denúncia ou uma chave derivada específica para mensagens.

## Gestão de chaves
A implementação deve ter:
- chave de recuperação institucional mantida offline;
- chave pessoal por usuário interno, gerada no navegador;
- chave privada pessoal armazenada somente cifrada;
- rotação e revogação de chaves;
- reencapsulamento da chave da denúncia ao atribuir acesso a um novo operador;
- recuperação administrativa sem colocar uma chave-mestra em variável de ambiente da Vercel/Supabase.

## Impactos
- detalhes e anexos deixam de poder ser renderizados no servidor;
- telas administrativas sensíveis passam a descriptografar no cliente;
- pesquisa textual em descrição/endereço deixa de funcionar no banco;
- backup deve preservar ciphertext e envelopes de chaves; exportação legível precisa ser uma operação explícita no navegador autorizado;
- migração das denúncias antigas exige um processo controlado;
- auditoria registra acesso e operações, mas nunca plaintext.

## Implantação sugerida
Fase 1: headers de privacidade, no-store, rate limit e revisão de logs.
Fase 2: infraestrutura de chaves e prova de conceito em ambiente de teste.
Fase 3: criptografia de mensagens e campos textuais.
Fase 4: criptografia de anexos.
Fase 5: migração do acervo, backup/restore E2EE e revisão independente de segurança.
