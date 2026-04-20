import { MeetingDraft, MeetingInsights, MeetingMinutes, MemberProfile, TaskRecord } from "../types";

function resolveMemberName(memberId: string | null, members: MemberProfile[]) {
  return members.find((member) => member.id === memberId)?.nome ?? "Responsavel nao identificado";
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "reuniao-luciana";
}

export function buildMeetingMarkdown(
  draft: MeetingDraft,
  insights: MeetingInsights,
  members: MemberProfile[],
  tasks: TaskRecord[] = insights.tarefas,
  minutes: MeetingMinutes = insights.ata,
  followUpSuggestion: string = insights.followUpSuggestion
) {
  const title = draft.titulo.trim() || insights.tituloSugerido;
  const taskLines = tasks
    .map(
      (task) =>
        `- ${task.titulo} | Responsavel: ${resolveMemberName(task.responsavelId, members)} | Prazo: ${task.prazo ?? "nao definido"} | Status: ${task.status} | Prioridade: ${task.prioridade}`
    )
    .join("\n");

  const blocks = insights.transcricaoBlocos
    .map((block) => `- ${block.speaker}: ${block.text}`)
    .join("\n");

  return `# ${title}

- Data: ${draft.data}
- Duracao: ${draft.duracaoSegundos} segundos
- Participantes: ${minutes.participantes.join(", ") || "Nao identificados"}

## Resumo executivo

${minutes.resumo}

## Decisoes

${minutes.decisoes.map((item) => `- ${item}`).join("\n")}

## Pendencias

${minutes.pendencias.map((item) => `- ${item}`).join("\n")}

## Proximos passos

${minutes.proximosPassos.map((item) => `- ${item}`).join("\n")}

## Tarefas por membro

${taskLines || "- Nenhuma tarefa detectada"}

## Sugestao de acompanhamento

${followUpSuggestion}

## Blocos de transcricao

${blocks || "- Nenhum bloco gerado"}

## Transcricao completa

${draft.transcricao || "Sem transcricao registrada"}

## Observacoes

${draft.observacoes || "Sem observacoes adicionais"}
`;
}

export function buildMeetingJson(
  draft: MeetingDraft,
  insights: MeetingInsights,
  members: MemberProfile[],
  tasks: TaskRecord[] = insights.tarefas,
  minutes: MeetingMinutes = insights.ata,
  followUpSuggestion: string = insights.followUpSuggestion
) {
  const title = draft.titulo.trim() || insights.tituloSugerido;

  return JSON.stringify(
    {
      id: draft.id ?? null,
      titulo: title,
      data: draft.data,
      duracaoSegundos: draft.duracaoSegundos,
      participantes: minutes.participantes,
      temas: minutes.temas,
      resumo: minutes.resumo,
      decisoes: minutes.decisoes,
      pendencias: minutes.pendencias,
      proximosPassos: minutes.proximosPassos,
      tarefas: tasks.map((task) => ({
        ...task,
        responsavelNome: resolveMemberName(task.responsavelId, members)
      })),
      sugestaoAcompanhamento: followUpSuggestion,
      transcricaoBlocos: insights.transcricaoBlocos,
      transcricao: draft.transcricao,
      observacoes: draft.observacoes
    },
    null,
    2
  );
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildExportFileName(draft: MeetingDraft, fallbackTitle: string, extension: string) {
  const title = draft.titulo.trim() || fallbackTitle;
  return `${safeFileName(title)}.${extension}`;
}
