export const roleDefinitions = {
  ADMIN: {
    label: "Administrador",
    summary: "Administra toda a plataforma e possui visão completa das denúncias.",
    permissions: ["Visualiza todas as denúncias", "Gerencia usuários, perfis e grupamentos", "Pode intervir em atribuições como contingência", "Acessa auditoria, backup e armazenamento"],
  },
  DIRETORIA: {
    label: "Diretoria Operacional",
    summary: "Perfil institucional da Diretoria Operacional. Pode ser atribuído ao diretor e a outros integrantes autorizados da Diretoria, todos com visão operacional completa.",
    permissions: ["Visualiza todas as denúncias", "Recebe as novas denúncias aguardando triagem", "Encaminha ou reencaminha denúncias aos grupamentos", "Acompanha todos os grupamentos", "Não gerencia usuários, backup ou configurações administrativas"],
  },
  COORDENADOR: {
    label: "Chefia / Coordenação",
    summary: "Perfil destinado aos chefes e coordenadores de grupamento, inclusive chefias especializadas, com acesso às denúncias dos grupamentos sob sua responsabilidade.",
    permissions: ["Visualiza as denúncias dos grupamentos que chefia ou coordena", "Atribui e redistribui denúncias aos agentes/operadores da unidade", "Acompanha andamento, histórico, anexos e comunicações", "Pode registrar observações e atuar no fluxo operacional", "Não realiza a triagem geral da Diretoria"],
  },
  OPERADOR: {
    label: "Agente / Operador",
    summary: "Perfil operacional para agentes, operadores e inspetores. O cargo institucional continua sendo informado separadamente no cadastro/perfil.",
    permissions: ["Visualiza as denúncias atribuídas a si", "Consulta detalhes, localização, histórico e anexos", "Atualiza o andamento permitido", "Registra observações e mensagens", "Não distribui denúncias nem realiza triagem"],
  },
} as const;
export type VortexRole = keyof typeof roleDefinitions;
export const vortexRoles = Object.keys(roleDefinitions) as VortexRole[];
export function roleDefinition(value: string) { return roleDefinitions[value as VortexRole]; }
