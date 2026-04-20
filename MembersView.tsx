import { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { MemberAvatar } from "../components/MemberAvatar";
import { DraftMode, MemberSnapshot, MeetingRecord, TaskStatus } from "../types";

interface MembersViewProps {
  addMemberNote: (event: FormEvent) => void;
  filteredMemberSnapshots: MemberSnapshot[];
  handleMemberPhotoRemove: (memberId: string) => void;
  handleMemberPhotoUpload: (memberId: string, event: ChangeEvent<HTMLInputElement>) => void;
  loadMeeting: (meeting: MeetingRecord, mode: DraftMode) => Promise<void>;
  lucianaMoment: string;
  memberNoteDraft: string;
  memberSearch: string;
  selectedMember: MemberSnapshot | null;
  selectedMemberId: string | null;
  setMemberNoteDraft: Dispatch<SetStateAction<string>>;
  setMemberSearch: Dispatch<SetStateAction<string>>;
  setSelectedMemberId: Dispatch<SetStateAction<string | null>>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
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

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function MembersView({
  addMemberNote,
  filteredMemberSnapshots,
  handleMemberPhotoRemove,
  handleMemberPhotoUpload,
  loadMeeting,
  lucianaMoment,
  memberNoteDraft,
  memberSearch,
  selectedMember,
  selectedMemberId,
  setMemberNoteDraft,
  setMemberSearch,
  setSelectedMemberId,
  updateTaskStatus
}: MembersViewProps) {
  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Perfis da equipe</p>
          <h2>Quem esta fazendo o que, quem sumiu e quem entregou.</h2>
        </div>
      </header>

      <section className="workspace-grid member-workspace">
        <article className="panel member-list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Membros</p>
              <h3>Perfis internos clicaveis</h3>
            </div>
          </div>

          <label className="field-block">
            <span>Buscar por nome, funcao ou contexto</span>
            <input
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Ex.: Comercial, Operacoes, follow-up"
              value={memberSearch}
            />
          </label>

          <div className="member-grid">
            {filteredMemberSnapshots.map((member) => (
              <button
                key={member.id}
                className={selectedMemberId === member.id ? "member-card active" : "member-card"}
                onClick={() => setSelectedMemberId(member.id)}
                type="button"
              >
                <div className="member-card-head">
                  <MemberAvatar member={member} size="large" />
                  <div>
                    <strong>{member.nome}</strong>
                    <span>{member.cargo}</span>
                  </div>
                </div>
                <p>{member.historicoResumido}</p>
                <small>
                  {pluralize(member.openTasks.length, "tarefa aberta", "tarefas abertas")} -{" "}
                  {member.lastRecord
                    ? `Ultimo registro em ${formatDateTime(member.lastRecord.data)}`
                    : "Sem registro ainda"}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel member-profile-panel">
          {selectedMember ? (
            <>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Perfil do membro</p>
                  <h3>{selectedMember.nome}</h3>
                </div>
              </div>

              <div className="profile-header">
                <MemberAvatar member={selectedMember} size="xl" />
                <div>
                  <strong>{selectedMember.cargo}</strong>
                  <p>{selectedMember.historicoResumido}</p>
                </div>
              </div>

              <section className="result-section">
                <div className="section-head">
                  <h4>Presenca da Luciana</h4>
                </div>
                <p>{lucianaMoment}</p>
                <div className="photo-actions">
                  <label className="ghost-button upload-label">
                    {selectedMember.fotoUrl ? "Trocar foto" : "Enviar foto"}
                    <input
                      accept="image/*"
                      onChange={(event) => handleMemberPhotoUpload(selectedMember.id, event)}
                      type="file"
                    />
                  </label>
                  {selectedMember.fotoUrl && (
                    <button
                      className="ghost-button"
                      onClick={() => handleMemberPhotoRemove(selectedMember.id)}
                      type="button"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </section>

              <div className="two-column">
                <section className="result-section">
                  <div className="section-head">
                    <h4>Tarefas pendentes</h4>
                  </div>
                  {selectedMember.openTasks.length === 0 ? (
                    <p className="empty-state">Sem tarefas abertas para este membro.</p>
                  ) : (
                    <div className="task-list compact">
                      {selectedMember.openTasks.map((task) => (
                        <article className="task-card compact" key={task.id}>
                          <div className="task-heading">
                            <div>
                              <strong>{task.titulo}</strong>
                              <span>{task.prazo ? `Prazo ${task.prazo}` : "Sem prazo"}</span>
                            </div>
                            <select
                              onChange={(event) =>
                                updateTaskStatus(task.id, event.target.value as TaskStatus)
                              }
                              value={task.status}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="em andamento">Em andamento</option>
                              <option value="concluida">Concluida</option>
                            </select>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="result-section">
                  <div className="section-head">
                    <h4>Tarefas concluidas</h4>
                  </div>
                  {selectedMember.completedTasks.length === 0 ? (
                    <p className="empty-state">Ainda nao ha tarefas concluidas registradas.</p>
                  ) : (
                    <ul className="plain-list">
                      {selectedMember.completedTasks.map((task) => (
                        <li key={task.id}>
                          {task.titulo}
                          {task.prazo ? ` - ${task.prazo}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="result-section">
                <div className="section-head">
                  <h4>Notas e observacoes</h4>
                </div>

                <form className="inline-form" onSubmit={addMemberNote}>
                  <input
                    onChange={(event) => setMemberNoteDraft(event.target.value)}
                    placeholder={`Adicionar nota sobre ${selectedMember.nome}`}
                    value={memberNoteDraft}
                  />
                  <button className="ghost-button" type="submit">
                    Guardar nota
                  </button>
                </form>

                <ul className="plain-list">
                  {selectedMember.anotacoes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>

              <section className="result-section">
                <div className="section-head">
                  <h4>Linha do tempo de atividade</h4>
                </div>
                <div className="timeline">
                  {selectedMember.relatedMeetings.map((meeting) => (
                    <button
                      className="timeline-item interactive"
                      key={meeting.id}
                      onClick={() => void loadMeeting(meeting, "view")}
                      type="button"
                    >
                      <span>{formatDateTime(meeting.data)}</span>
                      <div>
                        <strong>{meeting.titulo}</strong>
                        <p>{meeting.ata.resumo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p className="empty-state">Selecione um membro para abrir o perfil detalhado.</p>
          )}
        </article>
      </section>
    </>
  );
}
