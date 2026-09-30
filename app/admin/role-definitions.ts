export const roleDefinitions = {
  ADMIN: {
    label: "Administrador",
    summary: "Administra a plataforma, usuários, auditoria, backup e armazenamento, com acesso integral ao VÓRTEX.",
    permissions: ["Visualiza todas as denúncias", "Gerencia usuários, perfis e grupamentos", "Pode intervir em atribuições como contingência", "Acessa auditoria, backup e armazenamento"],
  },
  DIRETORIA: {
    label: "Diretoria Operacional",
    summary: "Realiza a triagem geral das denúncias e define manualmente o grupamento responsável pelo atendimento.",
    permissions: ["Visualiza todas as denúncias operacionais", "Recebe as novas denúncias aguardando triagem", "Encaminha ou reencaminha denúncias aos grupamentos", "Acompanha o andamento de todos os grupamentos", "Não gerencia usuários, backup ou configurações administrativas"],
  },
  INTELIGENCIA: {
    label: "Chefe da Inteligência",
    summary: "Perfil de coordenação e análise subordinado à Diretoria Operacional, com visão geral das denúncias para apoio de inteligência.",
    permissions: ["Visualiza todas as denúncias e seus elementos operacionais", "Acompanha histórico, anexos e comunicações", "Pode registrar observações internas e apoiar a análise", "Não realiza a triagem geral", "Não distribui denúncias aos grupamentos ou operadores"],
  },
  COORDENADOR: {
    label: "Coordenador",
    summary: "Coordena um ou mais grupamentos e distribui as denúncias encaminhadas pela Diretoria aos inspetores/operadores vinculados.",
    permissions: ["Visualiza as denúncias dos grupamentos que coordena", "Atribui e redistribui denúncias aos operadores da unidade", "Acompanha andamento e histórico", "Não realiza a triagem geral", "Não gerencia usuários nem armazenamento"],
  },
  OPERADOR: {
    label: "Operador",
    summary: "Atua como inspetor/atendente operacional e executa as denúncias atribuídas ao seu usuário dentro do grupamento.",
    permissions: ["Visualiza denúncias atribuídas a si", "Consulta detalhes, localização, histórico e anexos", "Atualiza o andamento permitido", "Registra observações e mensagens", "Não distribui denúncias nem realiza triagem"],
  },
} as const;
export type VortexRole = keyof typeof roleDefinitions;
export const vortexRoles = Object.keys(roleDefinitions) as VortexRole[];
export function roleDefinition(value: string) { return roleDefinitions[value as VortexRole]; }
