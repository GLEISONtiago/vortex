export const roleDefinitions = {
  ADMIN: {
    label: "Administrador",
    summary: "Administra a plataforma, usuários, auditoria, backup e armazenamento, com acesso integral ao VÓRTEX.",
    permissions: ["Visualiza todas as denúncias", "Gerencia usuários e perfis", "Pode intervir em atribuições e atendimentos", "Acessa auditoria, backup e armazenamento"],
  },
  COORDENADOR: {
    label: "Coordenador",
    summary: "Gerencia a operação: acompanha a fila e distribui ou redistribui denúncias aos operadores.",
    permissions: ["Visualiza a fila operacional", "Atribui e redistribui denúncias", "Acompanha andamento e histórico", "Pode atualizar o fluxo e registrar observações", "Não gerencia usuários nem armazenamento"],
  },
  OPERADOR: {
    label: "Operador",
    summary: "Executa a análise e o atendimento das denúncias atribuídas ao seu usuário.",
    permissions: ["Visualiza denúncias atribuídas a si", "Consulta detalhes, localização, histórico e anexos", "Atualiza o andamento permitido", "Registra observações e mensagens", "Não distribui denúncias nem administra usuários"],
  },
} as const;
export type VortexRole = keyof typeof roleDefinitions;
export const vortexRoles = Object.keys(roleDefinitions) as VortexRole[];
export function roleDefinition(value: string) { return roleDefinitions[value as VortexRole]; }
