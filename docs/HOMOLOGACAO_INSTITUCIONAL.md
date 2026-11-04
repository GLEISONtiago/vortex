# VÓRTEX — Plano de homologação institucional (GCMJP)

**Situação:** preparação para projeto-piloto.  
**Ambiente:** https://vortex.gcmjp.com.br  
**Finalidade:** registrar testes reproduzíveis do canal do cidadão e das regras de acesso por perfil, antes da adoção institucional.

> Este plano não substitui avaliação jurídica, manifestação do encarregado de dados, análise de segurança ou aprovação da chefia. Utilize somente registros de teste, sem dados pessoais reais.

## 1. Responsabilidades a designar

| Participante | Responsabilidade na homologação |
| --- | --- |
| Administração do VÓRTEX | Disponibilizar contas de teste e acompanhar os registros |
| Diretoria | Validar triagem, classificação, encaminhamento e solicitação de complemento |
| Coordenação do grupamento | Validar atribuição de responsável e reencaminhamento quando permitido |
| Operador | Validar atendimento, mensagens, histórico e finalização |
| Tecnologia da Informação | Validar logs, proteção, acesso indevido, backups e recuperação |
| Encarregado municipal de dados / jurídico | Validar aviso de privacidade, base legal, retenção, compartilhamento e direitos dos titulares |

## 2. Fluxo público — registrar e acompanhar

- [ ] Abrir o formulário em celular e computador, incluindo teclado e leitor de tela.
- [ ] Registrar denúncia **sem identificação** e confirmar ausência de nome/telefone/e-mail armazenados.
- [ ] Registrar denúncia **com identificação voluntária** e validar campos.
- [ ] Testar CEP válido, CEP inválido e entrada manual do endereço.
- [ ] Testar mapa por clique e arrastando marcador; continuar quando mapa não carregar.
- [ ] Anexar imagens permitidas; testar formato inválido, tamanho excessivo e conexão instável.
- [ ] Testar PIN de seis dígitos, PIN diferente da confirmação e ausência de PIN.
- [ ] Conferir protocolo e acompanhar com PIN correto; testar PIN incorreto sem mostrar detalhes.
- [ ] Confirmar os cinco status públicos: NOVA, ENCAMINHADA, EM_ANALISE, EM_ATENDIMENTO e FINALIZADA.
- [ ] Solicitar complemento pela triagem; conferir destaque **A equipe solicitou informações complementares** no acompanhamento.
- [ ] Responder ao complemento; conferir confirmação de registro, remoção do indicador de espera e notificação à triagem.
- [ ] Finalizar denúncia; confirmar que o cidadão pode consultar a resposta mas não enviar novas mensagens.
- [ ] Verificar que informações de outras denúncias não ficam acessíveis por tentativa de protocolo/ID.

## 3. Matriz de acesso: permitido e negado

| Perfil | Deve conseguir | Deve ser impedido de |
| --- | --- | --- |
| ADMIN | Ver registros institucionais, triagem, configuração e auditoria conforme regras | Executar operações fora do serviço autenticado ou expor PIN |
| DIRETORIA | Ver denúncias institucionais, classificar e encaminhar | Atribuir operador diretamente ou alterar administração de contas sem autorização |
| COORDENADOR | Ver registros do(s) grupamento(s) coordenado(s), atribuir operador vinculado, registrar providências permitidas | Triar denúncias de outros grupamentos e atribuir operador de unidade diversa |
| OPERADOR | Ver somente denúncias com atribuição ativa, comunicar e atender suas ocorrências | Abrir denúncias não atribuídas, encaminhar para outros grupamentos ou alterar usuários |
| CIDADÃO | Consultar registro próprio por protocolo + PIN, responder quando aberto | Ler dados internos, auditar perfis ou consultar relatórios individuais de terceiros |

### Cenários negativos obrigatórios

- [ ] OPERADOR tenta abrir URL de denúncia de outro operador; deve receber acesso negado.
- [ ] OPERADOR tenta invocar operação de triagem via API/RPC; deve falhar por perfil.
- [ ] COORDENADOR de um grupamento tenta visualizar e atribuir ocorrência de outro; deve falhar.
- [ ] DIRETORIA tenta realizar operação exclusiva da coordenação; deve falhar.
- [ ] Usuário desativado tenta abrir tela ou RPC; deve falhar.
- [ ] Usuário sem sessão tenta abrir `/admin`; deve ser encaminhado à autenticação.
- [ ] Usuário autenticado tenta consultar uma denúncia sem vínculo pela API do banco; deve falhar.
- [ ] Operador tenta alterar diretamente o registro na API de tabelas em vez das operações autorizadas; deve falhar.

## 4. Privacidade e segurança

- [ ] Confirmar oficialmente qual órgão/entidade é o controlador do tratamento no VÓRTEX.
- [ ] Confirmar base(s) legal(is) aplicável(is) e a finalidade da coleta, inclusive denúncias anônimas.
- [ ] Validar o texto de `/privacidade` com a assessoria jurídica e com o encarregado de dados.
- [ ] Definir tabela de temporalidade, política de retenção e regras de descarte ou arquivamento.
- [ ] Documentar operadores tecnológicos, armazenamento, responsabilidades contratuais e eventual transferência internacional.
- [ ] Homologar procedimentos para exercício de direitos e incidentes de segurança.
- [ ] Confirmar que PINs não são armazenados em texto puro ou enviados por e-mail.
- [ ] Confirmar que mensagens e anexos não são divulgados publicamente por URL adivinhável.
- [ ] Revisar backups, teste de restauração, acessos administrativos e trilhas de auditoria.
- [ ] Revisar lista de funções `SECURITY DEFINER` expostas a perfis autenticados: assegurar verificação de `auth.uid()` e autorização própria em cada operação.
- [ ] Consultar os avisos do Supabase Database Security Advisor e registrar justificativa para as exceções intencionais.

**Referências institucionais:**
- Política de privacidade da Prefeitura de João Pessoa: https://www.joaopessoa.pb.gov.br/politica-de-privacidade/
- Contato do encarregado divulgado pela Prefeitura: encarregado.dpo@joaopessoa.pb.gov.br
- Lei nº 13.709/2018 (LGPD), especialmente arts. 6, 18 e 23.

## 5. Situação técnica conferida em 04/11/2026

- [x] Regras de visibilidade da função `vortex_can_view_report` verificam usuários ativos e distinguem ADMIN/DIRETORIA, COORDENADOR por unidade, e OPERADOR por atribuição.
- [x] A função de encaminhamento exige ADMIN/DIRETORIA; a função de atribuição exige COORDENADOR vinculado à unidade.
- [x] RLS está habilitado nas tabelas `vortex_reports` e `vortex_messages`.
- [x] Papel de banco `authenticated` não tem permissão direta de UPDATE em `vortex_reports`.
- [ ] Testes interativos completos com os quatro perfis: **pendentes**. No momento desta conferência havia contas ativas de ADMIN, COORDENADOR e OPERADOR, mas não uma conta ativa DIRETORIA.
- [ ] Aprovação formal do aviso de privacidade, política de retenção e uso do sistema: **pendente**.

**Critério de aceite:** nenhum acesso cruzado indevido; fluxo completo público/operacional aprovado, com evidências de sucesso e falhas; pendências jurídicas e de TI resolvidas ou formalmente registradas com responsável e prazo.

## 6. Registro de cada teste

Registrar: data, perfil de teste, protocolo fictício, ação, resultado esperado, resultado observado, evidência (captura sem dados reais), severidade da falha, responsável, prazo e validação final.

| Data | Perfil | Cenário | Esperado | Observado | Evidência | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | Pendente |
