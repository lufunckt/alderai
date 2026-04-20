import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { DraftMode, MeetingDraft, MeetingInsights, MeetingMinutes, MemberProfile, TaskPriority, TaskRecord, TaskStatus } from "../types";

interface MeetingResultViewProps {
  audioPreviewUrl: string;
  draft: MeetingDraft;
  draftMode: DraftMode;
  followUpSuggestion: string;
  handleDraftChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleExportJson: () => void;
  handleExportMarkdown: () => void;
  handleFollowUpSuggestionChange: (value: string) => void;
  handleMinutesListChange: (
    field: "participantes" | "temas" | "decisoes" | "pendencias" | "proximosPassos",
    value: string
  ) => void;
  handleMinutesRegenerate: () => void;
  handleMinutesSummaryChange: (value: string) => void;
  handleSaveMeeting: () => Promise<void> | void;
  handleTaskAdd: () => void;
  handleTaskChange: <Key extends keyof TaskRecord>(taskId: string, field: Key, value: TaskRecord[Key]) => void;
  handleTaskRegenerate: () => void;
  handleTaskRemove: (taskId: string) => void;
  insights: MeetingInsights;
  loadHistory: () => void;
  lucianaMoment: string;
  members: MemberProfile[];
  minutes: MeetingMinutes;
  openNewMeeting: () => void;
  setDraftMode: Dispatch<SetStateAction<DraftMode>>;
  tasks: TaskRecord[];
  timelineTasks: TaskRecord[];
  visualsExpanded: boolean;
  setVisualsExpanded: Dispatch<SetStateAction<boolean>>;
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

function priorityLabel(priority: TaskPriority) {
  if (priority === "alta") return "Alta";
  if (priority === "baixa") return "Baixa";
  return "Media";
}

function statusLabel(status: TaskStatus) {
  if (status === "concluida") return "Concluida";
  if (status === "em andamento") return "Em andamento";
  return "Pendente";
}

export function MeetingResultView({
  audioPreviewUrl,
  draft,
  draftMode,
  followUpSuggestion,
  handleDraftChange,
  handleExportJson,
  handleExportMarkdown,
  handleFollowUpSuggestionChange,
  handleMinutesListChange,
  handleMinutesRegenerate,
  handleMinutesSummaryChange,
  handleSaveMeeting,
  handleTaskAdd,
  handleTaskChange,
  handleTaskRegenerate,
  handleTaskRemove,
  insights,
  loadHistory,
  lucianaMoment,
  members,
  minutes,
  openNewMeeting,
  setDraftMode,
  tasks,
  timelineTasks,
  visualsExpanded,
  setVisualsExpanded
}: MeetingResultViewProps) {
  const isEditable = draftMode !== "view";
  const participantsValue = minutes.participantes.join(", ");
  const themesValue = minutes.temas.join(", ");
  const decisionsValue = minutes.decisoes.join("\n");
  const pendingValue = minutes.pendencias.join("\n");
  const nextStepsValue = minutes.proximosPassos.join("\n");

  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Leitura da reuniao</p>
          <h2>A Luciana montou a ata. Agora a gente lapida, salva e segue.</h2>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={loadHistory} type="button">
            Ver minhas atas
          </button>
          <button className="primary-button" onClick={openNewMeeting} type="button">
            Gravar outra
          </button>
        </div>
      </header>

      <section className="workspace-grid result-workspace">
        <article className="panel result-primary">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Resultado da reuniao</p>
              <h3>{draft.titulo.trim() || insights.tituloSugerido}</h3>
            </div>
            <div className="button-row compact">
              {draftMode === "view" ? (
                <button className="ghost-button" onClick={() => setDraftMode("edit")} type="button">
                  Ajustar essa reuniao
                </button>
              ) : (
                <button className="primary-button" onClick={() => void handleSaveMeeting()} type="button">
                  {draft.id ? "Guarda as alteracoes" : "Guarda isso, Luciana"}
                </button>
              )}
              <button className="ghost-button" onClick={handleExportMarkdown} type="button">
                Vira documento
              </button>
              <button className="ghost-button" onClick={handleExportJson} type="button">
                Baixa o JSON
              </button>
            </div>
          </div>

          <div className="result-meta">
            <span>{formatDateTime(draft.data)}</span>
            <span>{formatDuration(draft.duracaoSegundos)}</span>
            <span>{minutes.participantes.length} participantes</span>
          </div>

          <label className="field-block">
            <span>Caderno da reuniao</span>
            <textarea
              disabled={draftMode === "view"}
              name="transcricao"
              onChange={handleDraftChange}
              rows={14}
              value={draft.transcricao}
            />
          </label>

          <div className="two-column">
            <section className="result-section">
              <div className="section-head">
                <h4>Ata automatica</h4>
              </div>
              {isEditable ? (
                <div className="minutes-edit-grid">
                  <label className="field-block minutes-summary">
                    <span>Resumo executivo</span>
                    <textarea
                      onChange={(event) => handleMinutesSummaryChange(event.target.value)}
                      rows={5}
                      value={minutes.resumo}
                    />
                  </label>
                  <label className="field-block">
                    <span>Participantes</span>
                    <input
                      onChange={(event) => handleMinutesListChange("participantes", event.target.value)}
                      placeholder="Luisa, Luiza, Miguel"
                      value={participantsValue}
                    />
                  </label>
                  <label className="field-block">
                    <span>Temas</span>
                    <input
                      onChange={(event) => handleMinutesListChange("temas", event.target.value)}
                      placeholder="MVP, reuniao, follow-up"
                      value={themesValue}
                    />
                  </label>
                  <div className="button-row compact">
                    <button className="ghost-button" onClick={handleMinutesRegenerate} type="button">
                      Regerar ata automatica
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{minutes.resumo}</p>
                  <div className="tag-row">
                    {minutes.temas.map((theme) => (
                      <span className="tag" key={theme}>
                        {theme}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="result-section">
              <div className="section-head">
                <h4>Proximo empurrao da Luciana</h4>
              </div>
              {isEditable ? (
                <textarea
                  onChange={(event) => handleFollowUpSuggestionChange(event.target.value)}
                  rows={5}
                  value={followUpSuggestion}
                />
              ) : (
                <p>{followUpSuggestion}</p>
              )}
              <p className="luciana-inline-quote">{lucianaMoment}</p>
              {audioPreviewUrl && <audio controls src={audioPreviewUrl} />}
            </section>
          </div>

          <div className="three-column">
            <section className="result-section">
              <div className="section-head">
                <h4>Decisoes</h4>
              </div>
              {isEditable ? (
                <textarea
                  onChange={(event) => handleMinutesListChange("decisoes", event.target.value)}
                  rows={6}
                  value={decisionsValue}
                />
              ) : (
                <ul className="plain-list">
                  {minutes.decisoes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="result-section">
              <div className="section-head">
                <h4>Pendencias</h4>
              </div>
              {isEditable ? (
                <textarea
                  onChange={(event) => handleMinutesListChange("pendencias", event.target.value)}
                  rows={6}
                  value={pendingValue}
                />
              ) : (
                <ul className="plain-list">
                  {minutes.pendencias.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="result-section">
              <div className="section-head">
                <h4>Proximos passos</h4>
              </div>
              {isEditable ? (
                <textarea
                  onChange={(event) => handleMinutesListChange("proximosPassos", event.target.value)}
                  rows={6}
                  value={nextStepsValue}
                />
              ) : (
                <ul className="plain-list">
                  {minutes.proximosPassos.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="result-section">
            <div className="section-head">
              <h4>Tarefas por membro</h4>
            </div>
            {draftMode !== "view" && (
              <div className="button-row compact">
                <button className="ghost-button" onClick={handleTaskRegenerate} type="button">
                  Regerar automatico
                </button>
                <button className="ghost-button" onClick={handleTaskAdd} type="button">
                  Nova tarefa manual
                </button>
              </div>
            )}

            {tasks.length === 0 ? (
              <p className="empty-state">
                Nenhuma tarefa foi inferida automaticamente. Ajuste a transcricao ou adicione mais
                contexto para enriquecer a distribuicao.
              </p>
            ) : (
              <div className="task-list">
                {tasks.map((task) => {
                  const owner =
                    members.find((member) => member.id === task.responsavelId)?.nome ??
                    "Responsavel nao identificado";

                  if (draftMode !== "view") {
                    return (
                      <article className="task-card task-card-editable" key={task.id}>
                        <div className="task-edit-grid">
                          <label className="field-block">
                            <span>Titulo</span>
                            <input
                              onChange={(event) =>
                                handleTaskChange(task.id, "titulo", event.target.value)
                              }
                              placeholder="Ex.: Enviar proposta"
                              value={task.titulo}
                            />
                          </label>
                          <label className="field-block">
                            <span>Responsavel</span>
                            <select
                              onChange={(event) =>
                                handleTaskChange(
                                  task.id,
                                  "responsavelId",
                                  event.target.value || null
                                )
                              }
                              value={task.responsavelId ?? ""}
                            >
                              <option value="">Selecionar</option>
                              {members.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.nome}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field-block">
                            <span>Prazo</span>
                            <input
                              onChange={(event) =>
                                handleTaskChange(task.id, "prazo", event.target.value || null)
                              }
                              type="date"
                              value={task.prazo ?? ""}
                            />
                          </label>
                          <label className="field-block">
                            <span>Status</span>
                            <select
                              onChange={(event) =>
                                handleTaskChange(
                                  task.id,
                                  "status",
                                  event.target.value as TaskStatus
                                )
                              }
                              value={task.status}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="em andamento">Em andamento</option>
                              <option value="concluida">Concluida</option>
                            </select>
                          </label>
                          <label className="field-block">
                            <span>Prioridade</span>
                            <select
                              onChange={(event) =>
                                handleTaskChange(
                                  task.id,
                                  "prioridade",
                                  event.target.value as TaskPriority
                                )
                              }
                              value={task.prioridade}
                            >
                              <option value="alta">Alta</option>
                              <option value="media">Media</option>
                              <option value="baixa">Baixa</option>
                            </select>
                          </label>
                        </div>

                        <label className="field-block">
                          <span>Descricao</span>
                          <textarea
                            onChange={(event) =>
                              handleTaskChange(task.id, "descricao", event.target.value)
                            }
                            placeholder="Descreva o que precisa ser feito"
                            rows={3}
                            value={task.descricao}
                          />
                        </label>

                        <div className="task-edit-actions">
                          <span className="task-owner-hint">{owner}</span>
                          <button
                            className="danger-button"
                            onClick={() => handleTaskRemove(task.id)}
                            type="button"
                          >
                            Remover tarefa
                          </button>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article className="task-card" key={task.id}>
                      <div className="task-heading">
                        <div>
                          <strong>{task.titulo}</strong>
                          <span>{owner}</span>
                        </div>
                        <div className="task-meta">
                          <span className={`badge priority-${task.prioridade}`}>
                            {priorityLabel(task.prioridade)}
                          </span>
                          <span className={`badge status-${task.status.replace(/\s+/g, "-")}`}>
                            {statusLabel(task.status)}
                          </span>
                        </div>
                      </div>
                      <p>{task.descricao}</p>
                      <small>{task.prazo ? `Prazo: ${task.prazo}` : "Sem prazo detectado"}</small>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </article>

        <article className="panel result-secondary">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Blocos e visuais</p>
              <h3>O mural que saiu dessa conversa</h3>
            </div>
            <button className="ghost-button" onClick={() => setVisualsExpanded((current) => !current)} type="button">
              {visualsExpanded ? "Esconder o mural" : "Abrir o mural"}
            </button>
          </div>

          <div className="transcript-blocks">
            {insights.transcricaoBlocos.map((block) => (
              <div className="transcript-block" key={block.id}>
                <strong>{block.speaker}</strong>
                <p>{block.text}</p>
              </div>
            ))}
          </div>

          {visualsExpanded && (
            <div className="visual-stack">
              <section className="visual-panel">
                <div className="section-head">
                  <h4>Distribuicao de tarefas</h4>
                </div>
                <div className="visual-list">
                  {members
                    .filter((member) => tasks.some((task) => task.responsavelId === member.id))
                    .map((member) => {
                      const amount = tasks.filter((task) => task.responsavelId === member.id).length;
                      return (
                        <div className="bar-row" key={member.id}>
                          <span>{member.nome}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${Math.max(22, amount * 28)}%`, background: member.cor }} />
                          </div>
                          <strong>{amount}</strong>
                        </div>
                      );
                    })}
                </div>
              </section>

              <section className="visual-panel">
                <div className="section-head">
                  <h4>Timeline de proximos passos</h4>
                </div>
                {timelineTasks.length === 0 ? (
                  <p className="empty-state">Nenhum prazo detectado automaticamente nesta reuniao.</p>
                ) : (
                  <div className="timeline">
                    {timelineTasks.map((task) => (
                      <div className="timeline-item" key={task.id}>
                        <span>{task.prazo}</span>
                        <div>
                          <strong>{task.titulo}</strong>
                          <p>{members.find((member) => member.id === task.responsavelId)?.nome ?? "Equipe"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="visual-panel">
                <div className="section-head">
                  <h4>Mapa de decisoes</h4>
                </div>
                <div className="decision-map">
                  {minutes.decisoes.map((decision) => (
                    <div className="decision-node" key={decision}>
                      <strong>Decisao</strong>
                      <p>{decision}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
