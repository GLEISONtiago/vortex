export const roleDefinitions = {
  ADMIN: {
    label: "Administrador",
    summary: "Administra a plataforma, usuários, auditoria, backup e armazenamento, com acesso integral ao VÓRTEX.",
    permissions: ["Visualiza todas as denúncias", "Gerencia usuários e perfis", "Pode intervir em atribuições e atendimentos", "Acessa auditoria, backup e armazenamento"],
  },
  COORDENADOR: {
    label: "Coordenador",
    summary: "Coordena um ou mais grupamentos: acompanha a fila da sua unidade e distribui denúncias aos inspetores/operadores vinculados.",
    permissions: ["Visualiza as denúncias dos grupamentos que coordena", "Atribui e redistribui denúncias aos operadores da unidade", "Pode receber permissão específica de triagem geral", "Acompanha andamento e histórico", "Não gerencia usuários nem armazenamento"],
  },
  OPERADOR: {
    label: "Operador",
    summary: "Atua como inspetor/atendente operacional e executa as denúncias atribuídas ao seu usuário dentro do grupamento.",
    permissions: ["Visualiza denúncias atribuídas a si", "Consulta detalhes, localização, histórico e anexos", "Atualiza o andamento permitido", "Registra observações e mensagens", "Não distribui denúncias nem administra usuários"],
  },
} as const;
export type VortexRole = keyof typeof roleDefinitions;
export const vortexRoles = Object.keys(roleDefinitions) as VortexRole[];
export function roleDefinition(value: string) { return roleDefinitions[value as VortexRole]; }
