import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { DraftMode, MeetingRecord, MemberProfile } from "../types";

interface HistoryViewProps {
  filteredMeetings: MeetingRecord[];
  handleExportWorkspace: () => Promise<void> | void;
  handleImportWorkspace: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  historySearch: string;
  loadMeeting: (meeting: MeetingRecord, mode: DraftMode) => Promise<void>;
  lucianaMoment: string;
  members: MemberProfile[];
  removeMeeting: (meetingId: string) => Promise<void>;
  setHistorySearch: Dispatch<SetStateAction<string>>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function HistoryView({
  filteredMeetings,
  handleExportWorkspace,
  handleImportWorkspace,
  historySearch,
  loadMeeting,
  lucianaMoment,
  members,
  removeMeeting,
  setHistorySearch
}: HistoryViewProps) {
  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Arquivo vivo</p>
          <h2>As reunioes que a Luciana ja transformou em memoria.</h2>
        </div>
      </header>

      <section className="workspace-grid history-workspace">
        <article className="panel history-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Historico de reunioes</p>
              <h3>Arquivo vivo da equipe</h3>
            </div>
            <div className="button-row compact">
              <button className="ghost-button" onClick={() => void handleExportWorkspace()} type="button">
                Exportar base
              </button>
              <label className="ghost-button upload-label">
                Importar base
                <input accept=".json" onChange={handleImportWorkspace} type="file" />
              </label>
            </div>
          </div>

          <div className="summary-block luciana-presence">
            <strong>Luciana lembra</strong>
            <p>{lucianaMoment}</p>
          </div>

          <label className="field-block">
            <span>Buscar por titulo, participante ou contexto</span>
            <input
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Ex.: Luisa, MVP, follow-up"
              value={historySearch}
            />
          </label>

          <div className="history-list">
            {filteredMeetings.map((meeting) => (
              <article className="history-row" key={meeting.id}>
                <div className="history-main">
                  <strong>{meeting.titulo}</strong>
                  <span>
                    {formatDateTime(meeting.data)} - {formatDuration(meeting.duracaoSegundos)}
                  </span>
                  <p>{meeting.ata.resumo}</p>
                  <small>
                    {meeting.membrosRelacionados
                      .map((memberId) => members.find((member) => member.id === memberId)?.nome)
                      .filter(Boolean)
                      .join(", ")}
                  </small>
                </div>
                <div className="history-actions">
                  <button className="ghost-button" onClick={() => void loadMeeting(meeting, "view")} type="button">
                    Abrir
                  </button>
                  <button className="ghost-button" onClick={() => void loadMeeting(meeting, "edit")} type="button">
                    Editar
                  </button>
                  <button className="danger-button" onClick={() => void removeMeeting(meeting.id)} type="button">
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
