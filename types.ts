export type AppView = "dashboard" | "meeting" | "result" | "members" | "history" | "persona";

export type DraftMode = "create" | "edit" | "view";

export type RecordingStatus = "idle" | "recording" | "paused" | "processing";

export type TaskStatus = "pendente" | "em andamento" | "concluida";

export type TaskPriority = "alta" | "media" | "baixa";

export interface MemberProfile {
  id: string;
  nome: string;
  cargo: string;
  foto: string;
  fotoUrl?: string;
  cor: string;
  anotacoes: string[];
  historicoResumido: string;
}

export interface LucianaPersona {
  nome: string;
  papel: string;
  fotoUrl: string;
  bio: string;
  greeting: string;
  processingLine: string;
  successLine: string;
  emptyStateLine: string;
  signoff: string;
  traits: string[];
  humorLines: string[];
  teamMoments: string[];
  memberMoments: Record<string, string[]>;
}

export interface TaskRecord {
  id: string;
  titulo: string;
  descricao: string;
  responsavelId: string | null;
  prazo: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  reuniaoId: string;
}

export interface MeetingMinutes {
  resumo: string;
  participantes: string[];
  temas: string[];
  decisoes: string[];
  pendencias: string[];
  proximosPassos: string[];
}

export interface TranscriptBlock {
  id: string;
  speaker: string;
  text: string;
  type: "manual" | "inferido" | "ao-vivo";
}

export interface MeetingRecord {
  id: string;
  titulo: string;
  data: string;
  duracaoSegundos: number;
  transcricao: string;
  observacoes: string;
  ata: MeetingMinutes;
  tarefas: TaskRecord[];
  membrosRelacionados: string[];
  sugestaoAcompanhamento: string;
  transcricaoBlocos: TranscriptBlock[];
  audioStorageKey?: string;
  updatedAt: string;
}

export interface MeetingInsights {
  tituloSugerido: string;
  ata: MeetingMinutes;
  tarefas: TaskRecord[];
  membersRelated: string[];
  transcricaoBlocos: TranscriptBlock[];
  followUpSuggestion: string;
}

export interface MeetingDraft {
  id: string | null;
  titulo: string;
  data: string;
  duracaoSegundos: number;
  transcricao: string;
  observacoes: string;
  participantIds: string[];
  audioStorageKey?: string;
}

export interface MemberSnapshot extends MemberProfile {
  openTasks: TaskRecord[];
  completedTasks: TaskRecord[];
  relatedMeetings: MeetingRecord[];
  lastRecord: MeetingRecord | null;
}

export interface WorkspaceBackupAudio {
  key: string;
  dataUrl: string;
}

export interface WorkspaceBackup {
  version: number;
  exportedAt: string;
  members: MemberProfile[];
  meetings: MeetingRecord[];
  audios: WorkspaceBackupAudio[];
}
