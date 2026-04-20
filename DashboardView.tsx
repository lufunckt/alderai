import { Dispatch, SetStateAction } from "react";
import { MemberAvatar } from "../components/MemberAvatar";
import { AppView, DraftMode, LucianaPersona, MemberSnapshot, MeetingRecord, TaskRecord } from "../types";

interface DashboardViewProps {
  decisionsCount: number;
  memberSnapshots: MemberSnapshot[];
  openNewMeeting: () => void;
  openTasks: TaskRecord[];
  openMeeting: (meeting: MeetingRecord, mode: DraftMode) => Promise<void>;
  persona: LucianaPersona;
  recentMeetings: MeetingRecord[];
  setView: Dispatch<SetStateAction<AppView>>;
  teamMoment: string;
  teamNameLabel: string;
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

export function DashboardView({
  memberSnapshots,
  openNewMeeting,
  openTasks,
  openMeeting,
  recentMeetings,
  setView,
  teamMoment,
  teamNameLabel
}: DashboardViewProps) {
  const latestMeeting = recentMeetings[0] ?? null;

  return (
    <>
      <header className="workspace-header dashboard-header">
        <div>
          <p className="eyebrow">Inicio</p>
          <h2>Painel do dia</h2>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => setView("history")} type="button">
            Atas
          </button>
          <button className="primary-button" onClick={openNewMeeting} type="button">
            Gravar nova
          </button>
        </div>
      </header>

      <section className="dashboard-plain">
        <div className="dashboard-plain-intro">
          <p className="body-copy">
            {teamNameLabel}, a Luciana deixou aqui so o necessario: ultima reuniao, tarefas
            abertas e equipe.
          </p>
          <small>{teamMoment}</small>
        </div>

        <section className="dashboard-plain-list">
          <article className="dashboard-strip">
            <div className="dashboard-strip-head">
              <div>
                <p className="eyebrow">Ultima reuniao</p>
                <h3>{latestMeeting ? latestMeeting.titulo : "Nenhuma reuniao salva ainda"}</h3>
              </div>
              <button
                className="ghost-button"
                disabled={!latestMeeting}
                onClick={() => latestMeeting && void openMeeting(latestMeeting, "view")}
                type="button"
              >
                Abrir
              </button>
            </div>

            {latestMeeting ? (
              <div className="dashboard-strip-body">
                <span className="dashboard-meta-line">{formatDateTime(latestMeeting.data)}</span>
                <p>{latestMeeting.ata.resumo}</p>
                <small>{latestMeeting.sugestaoAcompanhamento}</small>
              </div>
            ) : (
              <p className="empty-state">
                Assim que voce salvar a primeira reuniao, ela aparece aqui.
              </p>
            )}
          </article>

          <article className="dashboard-strip">
            <div className="dashboard-strip-head">
              <div>
                <p className="eyebrow">Tarefas abertas</p>
                <h3>{openTasks.length === 0 ? "Nada aberto agora" : `${openTasks.length} em andamento`}</h3>
              </div>
              <button className="ghost-button" onClick={() => setView("members")} type="button">
                Ver equipe
              </button>
            </div>

            {openTasks.length > 0 ? (
              <div className="dashboard-plain-rows">
                {openTasks.slice(0, 5).map((task) => {
                  const owner =
                    memberSnapshots.find((member) => member.id === task.responsavelId)?.nome ??
                    "Equipe";

                  return (
                    <div className="dashboard-row" key={task.id}>
                      <div>
                        <strong>{task.titulo}</strong>
                        <span>{owner}</span>
                      </div>
                      <small>{task.prazo ?? "Sem prazo"}</small>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-state">Nenhuma tarefa aberta no momento.</p>
            )}
          </article>

          <article className="dashboard-strip">
            <div className="dashboard-strip-head">
              <div>
                <p className="eyebrow">Equipe</p>
                <h3>Perfis principais</h3>
              </div>
              <button className="ghost-button" onClick={() => setView("members")} type="button">
                Abrir perfis
              </button>
            </div>

            <div className="dashboard-plain-rows">
              {memberSnapshots.map((member) => (
                <button
                  className="dashboard-row dashboard-member-plain"
                  key={member.id}
                  onClick={() => setView("members")}
                  type="button"
                >
                  <div className="dashboard-member-main">
                    <MemberAvatar member={member} size="large" />
                    <div>
                      <strong>{member.nome}</strong>
                      <span>{pluralize(member.openTasks.length, "tarefa aberta", "tarefas abertas")}</span>
                    </div>
                  </div>
                  <small>{pluralize(member.completedTasks.length, "concluida", "concluidas")}</small>
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>
    </>
  );
}
