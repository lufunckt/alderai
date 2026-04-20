import { ChangeEvent } from "react";
import { MemberAvatar } from "../components/MemberAvatar";
import { AppView, MeetingDraft, MemberProfile, RecordingStatus } from "../types";

interface MeetingComposerViewProps {
  assistantNotice: string;
  audioPreviewUrl: string;
  draft: MeetingDraft;
  handleAudioImport: (event: ChangeEvent<HTMLInputElement>) => void;
  handleDraftChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePauseRecording: () => void;
  handleProcessMeeting: () => void;
  handleStartRecording: () => Promise<void> | void;
  handleStopRecording: () => void;
  handleTranscriptImport: (event: ChangeEvent<HTMLInputElement>) => void;
  isSpeechRecognitionAvailable: boolean;
  lucianaMoment: string;
  members: MemberProfile[];
  recordingStatus: RecordingStatus;
  elapsedSeconds: number;
  toggleParticipant: (memberId: string) => void;
  setView: (view: AppView) => void;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function MeetingComposerView({
  assistantNotice,
  audioPreviewUrl,
  draft,
  handleAudioImport,
  handleDraftChange,
  handlePauseRecording,
  handleProcessMeeting,
  handleStartRecording,
  handleStopRecording,
  handleTranscriptImport,
  isSpeechRecognitionAvailable,
  lucianaMoment,
  members,
  recordingStatus,
  elapsedSeconds,
  toggleParticipant,
  setView
}: MeetingComposerViewProps) {
  const previewText = draft.transcricao || draft.observacoes;

  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Gravar nova</p>
          <h2>A Luciana ouve, guarda o audio e comeca a separar o que importa.</h2>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => setView("dashboard")} type="button">
            Voltar ao mural
          </button>
          <button className="primary-button" onClick={handleProcessMeeting} type="button">
            Escreve essa ata
          </button>
        </div>
      </header>

      <section className="workspace-grid meeting-workspace">
        <article className="panel composer-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Sala de captura</p>
              <h3>Grave, importe ou despeje a conversa inteira aqui</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field-block">
              <span>Titulo da reuniao</span>
              <input
                name="titulo"
                onChange={handleDraftChange}
                placeholder="Ex.: Planejamento comercial abril"
                value={draft.titulo}
              />
            </label>

            <label className="field-block">
              <span>Data e hora</span>
              <input
                name="data"
                onChange={handleDraftChange}
                type="datetime-local"
                value={draft.data}
              />
            </label>
          </div>

          <div className="participant-section">
            <span className="field-label">Perfis internos envolvidos</span>
            <div className="tag-row">
              {members.map((member) => (
                <button
                  key={member.id}
                  className={draft.participantIds.includes(member.id) ? "participant-chip active" : "participant-chip"}
                  onClick={() => toggleParticipant(member.id)}
                  type="button"
                >
                  <MemberAvatar member={member} size="small" />
                  {member.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <label className="field-block">
              <span>Importar audio existente</span>
              <input accept="audio/*" onChange={handleAudioImport} type="file" />
            </label>

            <label className="field-block">
              <span>Importar transcricao</span>
              <input accept=".txt,.md,.srt,.vtt,.json" onChange={handleTranscriptImport} type="file" />
            </label>
          </div>

          <div className="recorder-shell">
            <div className="recorder-head">
              <div>
                <p className="eyebrow">Gravacao local</p>
                <h4>{formatDuration(elapsedSeconds)}</h4>
              </div>
              <span className={`status-pill ${recordingStatus}`}>
                {recordingStatus === "recording" && "Gravando"}
                {recordingStatus === "paused" && "Pausado"}
                {recordingStatus === "processing" && "Finalizando"}
                {recordingStatus === "idle" && "Pronto"}
              </span>
            </div>

            <div className="cassette-visual" aria-hidden="true">
              <span className="cassette-reel" />
              <span className="cassette-reel" />
              <span className="cassette-label" />
            </div>

            <div className="button-row">
              <button className="primary-button" onClick={() => void handleStartRecording()} type="button">
                {recordingStatus === "paused" ? "Voltar a gravar" : "Gravar nova"}
              </button>
              <button className="ghost-button" disabled={recordingStatus !== "recording"} onClick={handlePauseRecording} type="button">
                Pausar
              </button>
              <button className="danger-button" disabled={recordingStatus !== "recording" && recordingStatus !== "paused"} onClick={handleStopRecording} type="button">
                Encerrar
              </button>
            </div>

            <p className="support-copy">
              O MVP grava o microfone do navegador, salva o audio localmente e deixa a transcricao
              prontinha para revisao. Captura do sistema e separacao perfeita por voz entram depois.
            </p>

            {audioPreviewUrl && (
              <div className="audio-preview">
                <audio controls src={audioPreviewUrl} />
                <a download={`${draft.titulo || "reuniao-luciana"}.webm`} href={audioPreviewUrl}>
                  Baixar audio
                </a>
              </div>
            )}
          </div>

          <label className="field-block">
            <span>Transcricao</span>
            <textarea
              name="transcricao"
              onChange={handleDraftChange}
              placeholder={
                isSpeechRecognitionAvailable
                  ? "A transcricao ao vivo aparece aqui conforme a conversa acontece."
                  : "Cole aqui a transcricao da reuniao ou escreva blocos como Nome: fala."
              }
              rows={12}
              value={draft.transcricao}
            />
          </label>

          <label className="field-block">
            <span>Observacoes rapidas</span>
            <textarea
              name="observacoes"
              onChange={handleDraftChange}
              placeholder="Contexto, links, nomes citados, bloqueios e observacoes de bastidor."
              rows={5}
              value={draft.observacoes}
            />
          </label>

          <div className="button-row">
            <button className="primary-button" onClick={handleProcessMeeting} type="button">
              Vem organizar isso
            </button>
            <button className="ghost-button" onClick={() => setView("dashboard")} type="button">
              Voltar ao mural
            </button>
          </div>
        </article>

        <article className="panel preview-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Leitura inicial</p>
              <h3>O que a Luciana ja pescou daqui</h3>
            </div>
          </div>

          <div className="preview-stack">
            <div className="summary-block">
              <strong>Status</strong>
              <p>{assistantNotice}</p>
            </div>
            <div className="summary-block luciana-presence">
              <strong>Luciana, em voz alta</strong>
              <p>{lucianaMoment}</p>
            </div>
            <div className="summary-block">
              <strong>Participantes marcados</strong>
              <p>
                {draft.participantIds.length > 0
                  ? `${draft.participantIds.length} perfis internos selecionados`
                  : "Nenhum perfil marcado ainda."}
              </p>
            </div>
            <div className="summary-block">
              <strong>Texto capturado</strong>
              <p>{previewText ? `${previewText.slice(0, 240)}${previewText.length > 240 ? "..." : ""}` : "A transcricao e as observacoes aparecerao aqui."}</p>
            </div>
            <div className="summary-block">
              <strong>Entradas aceitas</strong>
              <p>Audio ao vivo, audio importado e arquivos de transcricao em texto simples.</p>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
