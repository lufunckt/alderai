import {
  MeetingDraft,
  MeetingInsights,
  MemberProfile,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  TranscriptBlock
} from "../types";

const TASK_PATTERNS = [
  /fica responsavel/,
  /ficou responsavel/,
  /fica com/,
  /ficou com/,
  /precisa/,
  /precisamos/,
  /deve/,
  /vamos/,
  /enviar/,
  /ajustar/,
  /revisar/,
  /validar/,
  /agendar/,
  /marcar/,
  /compartilhar/,
  /preparar/,
  /organizar/,
  /atualizar/,
  /retornar/,
  /confirmar/,
  /subir/,
  /definir/,
  /criar/
];

const DECISION_PATTERNS = [
  /decid/,
  /aprovad/,
  /combinado/,
  /definid/,
  /vamos seguir/,
  /mantemos/,
  /manter/
];

const PENDING_PATTERNS = [
  /pendente/,
  /avaliar/,
  /verificar/,
  /aguardar/,
  /duvida/,
  /bloqueio/,
  /sem definir/,
  /falta/,
  /depende/
];

const STOPWORDS = new Set([
  "para",
  "com",
  "sobre",
  "entre",
  "depois",
  "antes",
  "ainda",
  "vamos",
  "precisa",
  "precisamos",
  "ficou",
  "responsavel",
  "reuniao",
  "cliente",
  "equipe",
  "hoje",
  "amanha",
  "semana",
  "sobre",
  "porque",
  "quando",
  "onde",
  "como",
  "mais",
  "menos",
  "muito",
  "pouco",
  "isso",
  "essa",
  "esse",
  "naquela",
  "aquele",
  "uma",
  "umas",
  "uns",
  "por",
  "das",
  "dos",
  "que",
  "pra",
  "pro"
]);

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(value: string) {
  return stripAccents(value).toLowerCase().replace(/[^\w\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

function toUniqueList(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function splitIntoSegments(value: string) {
  return value
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function capitalize(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function findResponsible(sentence: string, members: MemberProfile[], participantIds: string[]) {
  const normalizedSentence = normalize(sentence);
  const selectedMembers = members.filter((member) => participantIds.includes(member.id));

  for (const member of members) {
    const fullName = normalize(member.nome);
    const firstName = normalize(member.nome.split(" ")[0] ?? "");
    if (normalizedSentence.includes(fullName) || normalizedSentence.startsWith(`${firstName} `)) {
      return member;
    }
  }

  if (selectedMembers.length === 1) {
    return selectedMembers[0];
  }

  return null;
}

function inferPriority(sentence: string): TaskPriority {
  const normalizedSentence = normalize(sentence);

  if (
    normalizedSentence.includes("urgente") ||
    normalizedSentence.includes("hoje") ||
    normalizedSentence.includes("amanha") ||
    normalizedSentence.includes("bloqueio")
  ) {
    return "alta";
  }

  if (
    normalizedSentence.includes("quando der") ||
    normalizedSentence.includes("sem pressa") ||
    normalizedSentence.includes("depois")
  ) {
    return "baixa";
  }

  return "media";
}

function inferStatus(sentence: string): TaskStatus {
  const normalizedSentence = normalize(sentence);

  if (
    normalizedSentence.includes("concluido") ||
    normalizedSentence.includes("feito") ||
    normalizedSentence.includes("entregue")
  ) {
    return "concluida";
  }

  if (normalizedSentence.includes("andamento") || normalizedSentence.includes("tocando")) {
    return "em andamento";
  }

  return "pendente";
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function extractDueDate(sentence: string, baseDateText: string) {
  const normalizedSentence = normalize(sentence);
  const baseDate = new Date(baseDateText || Date.now());

  const isoMatch = sentence.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const dateMatch = sentence.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const year = dateMatch[3] ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : baseDate.getFullYear();
    return formatDateKey(new Date(year, month, day));
  }

  const dayOnlyMatch = normalizedSentence.match(/ate dia (\d{1,2})/);
  if (dayOnlyMatch) {
    const day = Number(dayOnlyMatch[1]);
    return formatDateKey(new Date(baseDate.getFullYear(), baseDate.getMonth(), day));
  }

  if (normalizedSentence.includes("amanha")) {
    return formatDateKey(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1));
  }

  if (normalizedSentence.includes("hoje")) {
    return formatDateKey(baseDate);
  }

  if (normalizedSentence.includes("semana que vem")) {
    return formatDateKey(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 7));
  }

  return null;
}

function buildTaskTitle(sentence: string, member: MemberProfile | null) {
  let value = sentence.trim();

  if (member) {
    const fullName = new RegExp(member.nome, "ig");
    const firstName = new RegExp(member.nome.split(" ")[0] ?? "", "ig");
    value = value.replace(fullName, "").replace(firstName, "");
  }

  value = value
    .replace(/^(vai|precisa|precisamos|ficou responsavel por|fica responsavel por|fica com|ficou com)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[,:-]\s*/, "")
    .trim();

  const cleaned = capitalize(value.replace(/[.?!]$/, ""));
  return cleaned.length > 74 ? `${cleaned.slice(0, 71).trim()}...` : cleaned;
}

function detectMemberIds(source: string, members: MemberProfile[]) {
  const normalizedSource = normalize(source);

  return members
    .filter((member) => {
      const fullName = normalize(member.nome);
      const firstName = normalize(member.nome.split(" ")[0] ?? "");
      return normalizedSource.includes(fullName) || normalizedSource.includes(firstName);
    })
    .map((member) => member.id);
}

function extractThemes(source: string, members: MemberProfile[]) {
  const normalizedMembers = new Set(
    members.flatMap((member) => normalize(member.nome).split(" ").filter(Boolean))
  );
  const counts = new Map<string, number>();

  normalize(source)
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .filter((word) => !STOPWORDS.has(word))
    .filter((word) => !normalizedMembers.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([word]) => word);
}

function extractTasks(
  sentences: string[],
  members: MemberProfile[],
  participantIds: string[],
  meetingId: string,
  meetingDate: string
) {
  const collected: TaskRecord[] = [];

  sentences.forEach((sentence, index) => {
    const normalizedSentence = normalize(sentence);
    const looksLikeTask = TASK_PATTERNS.some((pattern) => pattern.test(normalizedSentence));

    if (!looksLikeTask) {
      return;
    }

    const responsible = findResponsible(sentence, members, participantIds);
    if (!responsible) {
      return;
    }

    const title = buildTaskTitle(sentence, responsible);
    if (!title) {
      return;
    }

    collected.push({
      id: `task_${meetingId}_${index + 1}`,
      titulo: title,
      descricao: sentence.replace(/\s+/g, " ").trim(),
      responsavelId: responsible.id,
      prazo: extractDueDate(sentence, meetingDate),
      status: inferStatus(sentence),
      prioridade: inferPriority(sentence),
      reuniaoId: meetingId
    });
  });

  return collected.filter(
    (task, index, array) =>
      array.findIndex(
        (candidate) =>
          candidate.titulo === task.titulo && candidate.responsavelId === task.responsavelId
      ) === index
  );
}

function buildTranscriptBlocks(source: string, members: MemberProfile[]) {
  const lines = source
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map<TranscriptBlock>((line, index) => {
      const colonIndex = line.indexOf(":");

      if (colonIndex > 0) {
        const speakerCandidate = line.slice(0, colonIndex).trim();
        const matchedMember = members.find((member) => {
          const normalizedCandidate = normalize(speakerCandidate);
          return (
            normalizedCandidate === normalize(member.nome) ||
            normalizedCandidate === normalize(member.nome.split(" ")[0] ?? "")
          );
        });

        if (matchedMember) {
          return {
            id: `block_${index + 1}`,
            speaker: matchedMember.nome,
            text: line.slice(colonIndex + 1).trim(),
            type: "manual"
          };
        }
      }

      return {
        id: `block_${index + 1}`,
        speaker: "Registro",
        text: line,
        type: "manual"
      };
    });
  }

  return chunk(splitIntoSegments(source), 2).map<TranscriptBlock>((group, index) => ({
    id: `block_${index + 1}`,
    speaker: index === 0 ? "Abertura" : "Fluxo",
    text: group.join(" "),
    type: "inferido"
  }));
}

function buildSummary(args: {
  title: string;
  participants: string[];
  themes: string[];
  decisions: string[];
  pending: string[];
  tasks: TaskRecord[];
}) {
  const participantLabel =
    args.participants.length > 0 ? args.participants.join(", ") : "A equipe";
  const themeLabel =
    args.themes.length > 0 ? args.themes.slice(0, 3).join(", ") : "os principais pontos da pauta";

  return `${participantLabel} alinhou ${themeLabel}. Foram capturadas ${args.decisions.length} decisoes, ${args.tasks.length} tarefas acionaveis e ${args.pending.length} pendencias para acompanhamento.`;
}

function buildFollowUpSuggestion(
  meetingDateText: string,
  tasks: TaskRecord[],
  pending: string[],
  participants: string[]
) {
  const datedTasks = tasks.filter((task) => task.prazo).sort((left, right) =>
    String(left.prazo).localeCompare(String(right.prazo))
  );

  if (datedTasks[0]?.prazo) {
    return `Agendar checkpoint em ${datedTasks[0].prazo} para revisar ${datedTasks[0].titulo.toLowerCase()} e validar o restante dos encaminhamentos com ${participants.slice(0, 2).join(" e ") || "a equipe"}.`;
  }

  if (pending.length > 0) {
    const baseDate = new Date(meetingDateText || Date.now());
    const followUpDate = formatDateKey(
      new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 3)
    );
    return `Sugerido um novo alinhamento em ${followUpDate} para fechar ${pending[0].toLowerCase()}.`;
  }

  const baseDate = new Date(meetingDateText || Date.now());
  const followUpDate = formatDateKey(
    new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 7)
  );
  return `Sem bloqueios explicitos. Vale marcar um acompanhamento leve em ${followUpDate} para confirmar execucao e registrar aprendizados.`;
}

function inferTitle(draft: MeetingDraft, themes: string[]) {
  if (draft.titulo.trim()) {
    return draft.titulo.trim();
  }

  if (themes.length > 0) {
    return `Alinhamento sobre ${themes.slice(0, 2).join(" e ")}`;
  }

  return "Reuniao sem titulo";
}

export function buildMeetingInsights(draft: MeetingDraft, members: MemberProfile[]): MeetingInsights {
  const title = inferTitle(draft, extractThemes(draft.transcricao || draft.observacoes, members));
  const combinedSource = [draft.transcricao.trim(), draft.observacoes.trim()].filter(Boolean).join(". ");
  const sentences = splitIntoSegments(combinedSource);
  const inferredParticipants = detectMemberIds(combinedSource, members);
  const membersRelated = toUniqueList([...draft.participantIds, ...inferredParticipants]);
  const tasks = extractTasks(sentences, members, membersRelated, draft.id ?? "rascunho", draft.data);
  const decisions = toUniqueList(
    sentences.filter((sentence) => DECISION_PATTERNS.some((pattern) => pattern.test(normalize(sentence))))
  );
  const pending = toUniqueList(
    sentences.filter((sentence) => PENDING_PATTERNS.some((pattern) => pattern.test(normalize(sentence))))
  );
  const themes = extractThemes(combinedSource, members);
  const participants = members
    .filter((member) => membersRelated.includes(member.id))
    .map((member) => member.nome);
  const nextSteps = toUniqueList([
    ...tasks.map((task) => {
      const owner = members.find((member) => member.id === task.responsavelId)?.nome ?? "Equipe";
      return `${owner}: ${task.titulo}${task.prazo ? ` ate ${task.prazo}` : ""}.`;
    }),
    ...sentences.filter((sentence) => normalize(sentence).includes("proximo passo"))
  ]).slice(0, 5);

  const transcriptBlocks = buildTranscriptBlocks(draft.transcricao || draft.observacoes, members);

  return {
    tituloSugerido: title,
    ata: {
      resumo: buildSummary({
        title,
        participants,
        themes,
        decisions,
        pending,
        tasks
      }),
      participantes: participants,
      temas: themes.length > 0 ? themes : ["alinhamento geral"],
      decisoes: decisions.length > 0 ? decisions : ["Nenhuma decisao automatica detectada; revise a transcricao manualmente."],
      pendencias: pending.length > 0 ? pending : ["Sem pendencias explicitas detectadas ate o momento."],
      proximosPassos:
        nextSteps.length > 0 ? nextSteps : ["Adicionar um proximo passo manual para fechar a reuniao."]
    },
    tarefas: tasks,
    membersRelated,
    transcricaoBlocos: transcriptBlocks.length > 0 ? transcriptBlocks : [
      {
        id: "block_empty",
        speaker: "Luciana",
        text: "Ainda nao houve texto suficiente para montar blocos de transcricao.",
        type: "inferido"
      }
    ],
    followUpSuggestion: buildFollowUpSuggestion(draft.data, tasks, pending, participants)
  };
}
