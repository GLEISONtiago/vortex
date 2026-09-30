export const roleDefinitions = {
  ADMIN: {
    label: "Administrador",
    summary: "Administração completa da plataforma, usuários, denúncias, auditoria e armazenamento.",
    permissions: ["Visualiza todas as denúncias", "Gerencia usuários e perfis", "Atribui responsáveis", "Altera status e registra observações", "Acessa backup e armazenamento", "Consulta recursos administrativos"],
  },
  COORDENADOR: {
    label: "Coordenador",
    summary: "Coordena a fila operacional e distribui denúncias para a equipe.",
    permissions: ["Visualiza denúncias disponíveis à coordenação", "Atribui e redistribui responsáveis", "Acompanha andamento e histórico", "Altera status e registra observações", "Não gerencia usuários nem armazenamento"],
  },
  AGENTE: {
    label: "Agente",
    summary: "Executa o atendimento das denúncias atribuídas ao seu usuário.",
    permissions: ["Visualiza denúncias atribuídas a si", "Consulta detalhes, localização e anexos", "Atualiza o atendimento permitido", "Registra observações e mensagens", "Não distribui denúncias nem administra usuários"],
  },
  ANALISTA: {
    label: "Analista",
    summary: "Atua na análise das denúncias que forem atribuídas ao seu usuário.",
    permissions: ["Visualiza denúncias atribuídas a si", "Consulta detalhes, histórico e anexos", "Registra análise e informações operacionais", "Atualiza o fluxo permitido", "Não distribui denúncias nem administra usuários"],
  },
} as const;

export type VortexRole = keyof typeof roleDefinitions;
export const vortexRoles = Object.keys(roleDefinitions) as VortexRole[];
export function roleDefinition(value: string) { return roleDefinitions[value as VortexRole]; }
