export const statusLabel = (value: string) => ({ NOVA: "Nova", EM_ANALISE: "Em análise", ENCAMINHADA: "Encaminhada", EM_ATENDIMENTO: "Em atendimento", CONCLUIDA: "Concluída", IMPROCEDENTE: "Improcedente" }[value] ?? value);
export const urgencyLabel = (value: string) => ({ LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" }[value] ?? value);
export const roleLabel = (value: string) => ({ ADMIN: "Administrador", COORDENADOR: "Coordenador", AGENTE: "Agente", ANALISTA: "Analista" }[value] ?? value);
export const formatAssignedAt = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)).replace(",", " às");
export const historyLabel = (oldStatus: string | null, newStatus: string) => oldStatus === null && newStatus === "NOVA" ? "Denúncia registrada — Nova" : `${oldStatus ? statusLabel(oldStatus) : "—"} → ${statusLabel(newStatus)}`;
