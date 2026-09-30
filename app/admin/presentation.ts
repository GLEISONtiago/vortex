export const statusLabel = (value: string) => ({ NOVA: "Nova", EM_ANALISE: "Em análise", EM_ATENDIMENTO: "Em atendimento", FINALIZADA: "Finalizada", ENCAMINHADA: "Em atendimento", CONCLUIDA: "Finalizada", IMPROCEDENTE: "Finalizada" }[value] ?? value);
export const urgencyLabel = (value: string) => ({ LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" }[value] ?? value);
export const roleLabel = (value: string) => ({ ADMIN: "Administrador", DIRETORIA: "Diretoria Operacional", INTELIGENCIA: "Chefia / Coordenação", COORDENADOR: "Chefia / Coordenação", OPERADOR: "Agente / Operador", AGENTE: "Operador", ANALISTA: "Operador" }[value] ?? value);
export const formatAssignedAt = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)).replace(",", " às");
export const historyLabel = (oldStatus: string | null, newStatus: string) => oldStatus === null && newStatus === "NOVA" ? "Denúncia registrada — Nova" : `${oldStatus ? statusLabel(oldStatus) : "—"} → ${statusLabel(newStatus)}`;

export const resolutionLabel = (value: string | null | undefined) => ({ PROCEDENTE: "Procedente", IMPROCEDENTE: "Improcedente", RESOLVIDA: "Resolvida", ENCAMINHADA_OUTRO_ORGAO: "Encaminhada a outro órgão", NAO_FOI_POSSIVEL_AVERIGUAR: "Não foi possível averiguar" }[value ?? ""] ?? value ?? "—");
