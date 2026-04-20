import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  TournamentAnalysis,
  UploadedTournamentFile,
  analyzeTournamentFiles,
  fetchDemoAnalysis
} from "../api/client";

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Nao consegui ler ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function buildUploads(files: File[]) {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const content = await toBase64(file);
      return {
        name: file.name,
        content,
        encoding: "base64"
      } satisfies UploadedTournamentFile;
    })
  );
  return uploads;
}

export default function TournamentProfilerPage() {
  const [targetPlayer, setTargetPlayer] = useState("biawhite");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<TournamentAnalysis | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    fetchDemoAnalysis()
      .then((payload) => {
        if (!active) return;
        setAnalysis(payload);
      })
      .catch((reason: Error) => {
        if (!active) return;
        setError(reason.message);
      })
      .finally(() => {
        if (!active) return;
        setLoadingDemo(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setError("Selecione pelo menos um arquivo de torneio antes de analisar.");
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      const uploads = await buildUploads(selectedFiles);
      const payload = await analyzeTournamentFiles(targetPlayer.trim() || "biawhite", uploads);
      setAnalysis(payload);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="profiler-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">8-Game Tournament Profiler</p>
          <h1>Perfil da biawhite por modalidade e scouting de cada oponente.</h1>
          <p className="hero-summary">
            O app aceita `csv`, `txt`, `json`, `log` e `zip`, cruza as maos onde a `biawhite`
            aparece e devolve leitura por modalidade do mixed game, riscos recorrentes e perfis
            exploraveis dos adversarios observados.
          </p>
          <div className="hero-tags">
            <span>Upload de arquivos</span>
            <span>Leitura por modalidade</span>
            <span>Perfil de oponentes</span>
            <span>Demo pronta enquanto voce envia os dados</span>
          </div>
        </div>

        <form className="upload-panel" onSubmit={handleSubmit}>
          <div className="form-block">
            <label htmlFor="target-player">Jogador foco</label>
            <input
              id="target-player"
              value={targetPlayer}
              onChange={(event) => setTargetPlayer(event.target.value)}
              placeholder="biawhite"
            />
          </div>

          <div className="form-block">
            <label htmlFor="tournament-files">Arquivos dos torneios</label>
            <input
              id="tournament-files"
              type="file"
              multiple
              accept=".csv,.txt,.log,.json,.ndjson,.tsv,.zip"
              onChange={handleFileChange}
            />
            <p className="field-hint">
              Pode mandar export de torneio, hand histories, notas ou um `.zip` com tudo junto.
            </p>
          </div>

          <div className="selected-files">
            {selectedFiles.length === 0 ? (
              <p>Nenhum arquivo selecionado ainda.</p>
            ) : (
              selectedFiles.map((file) => <span key={file.name}>{file.name}</span>)
            )}
          </div>

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Analisando arquivos..." : "Gerar perfil completo"}
          </button>
        </form>
      </section>

      {error && <div className="feedback error">{error}</div>}
      {loadingDemo && <div className="feedback">Carregando demo do painel...</div>}

      {analysis && (
        <>
          <section className="metrics-grid">
            <article className="metric-card">
              <span>Arquivos</span>
              <strong>{analysis.metrics.files_processed}</strong>
              <small>processados</small>
            </article>
            <article className="metric-card">
              <span>Registros</span>
              <strong>{analysis.metrics.target_records}</strong>
              <small>com a biawhite</small>
            </article>
            <article className="metric-card">
              <span>Torneios</span>
              <strong>{analysis.metrics.tournaments}</strong>
              <small>resumidos</small>
            </article>
            <article className="metric-card">
              <span>Modalidades</span>
              <strong>{analysis.metrics.modalities}</strong>
              <small>mapeadas</small>
            </article>
            <article className="metric-card">
              <span>Oponentes</span>
              <strong>{analysis.metrics.opponents}</strong>
              <small>perfilados</small>
            </article>
            <article className="metric-card">
              <span>Confianca</span>
              <strong>{analysis.metrics.confidence}</strong>
              <small>na leitura atual</small>
            </article>
          </section>

          <section className="profile-grid">
            <article className="profile-card spotlight-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Perfil da jogadora</p>
                  <h2>{analysis.player_profile.player_name}</h2>
                </div>
                <span className="chip accent">{analysis.player_profile.primary_style}</span>
              </div>
              <p className="lead-copy">{analysis.player_profile.overview}</p>

              <div className="evidence-strip">
                <span className="chip subtle">VPIP {toPercent(analysis.player_profile.vpip_rate)}</span>
                <span className="chip subtle">Win {toPercent(analysis.player_profile.win_rate)}</span>
                <span className="chip subtle">Showdown {toPercent(analysis.player_profile.showdown_rate)}</span>
              </div>

              <div className="detail-columns">
                <div>
                  <h3>Forcas</h3>
                  <ul>
                    {analysis.player_profile.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Leaks</h3>
                  <ul>
                    {analysis.player_profile.leaks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Ajustes sugeridos</h3>
                  <ul>
                    {analysis.player_profile.adjustments.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="evidence-strip">
                {analysis.player_profile.dominant_modalities.map((item) => (
                  <span className="chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>

            <article className="profile-card notes-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Leitura da amostra</p>
                  <h2>O que sustentou o scouting</h2>
                </div>
              </div>
              <ul>
                {analysis.metrics.source_notes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Jogadores detectados</h3>
              <div className="evidence-strip">
                {analysis.discovered_players.map((item) => (
                  <span className="chip subtle" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          </section>

          <section className="section-block">
            <div className="section-title">
              <p className="eyebrow">Modalidades do 8-game</p>
              <h2>Como a biawhite aparece em cada jogo</h2>
            </div>
            <div className="cards-grid">
              {analysis.modalities.map((modality) => (
                <article className="modality-card" key={modality.name}>
                  <div className="card-heading">
                    <div>
                      <h3>{modality.name}</h3>
                      <p>{modality.sample_size} registros</p>
                    </div>
                    <span className="chip">{modality.confidence}</span>
                  </div>
                  <p className="lead-copy">{modality.style}</p>
                  <div className="evidence-strip">
                    <span className="chip subtle">VPIP {toPercent(modality.vpip_rate)}</span>
                    <span className="chip subtle">Win {toPercent(modality.win_rate)}</span>
                    <span className="chip subtle">Showdown {toPercent(modality.showdown_rate)}</span>
                    <span className="chip subtle">Fold cedo {toPercent(modality.early_fold_rate)}</span>
                  </div>
                  <h4>Forcas</h4>
                  <ul>
                    {modality.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>Riscos</h4>
                  <ul>
                    {modality.risks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>Ajustes</h4>
                  <ul>
                    {modality.adjustments.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="evidence-strip">
                    {modality.opponents.map((item) => (
                      <span className="chip subtle" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-title">
              <p className="eyebrow">Resumo dos torneios</p>
              <h2>Contexto agregado dos MTTs analisados</h2>
            </div>
            <div className="cards-grid file-grid">
              {analysis.tournaments.map((tournament) => (
                <article className="tournament-card" key={tournament.tournament_id}>
                  <div className="card-heading">
                    <div>
                      <h3>Torneio {tournament.tournament_id}</h3>
                      <p>{tournament.buy_in_text || "Buy-in nao informado"}</p>
                    </div>
                  </div>
                  <div className="evidence-strip">
                    <span className="chip subtle">{tournament.hands} maos</span>
                    <span className="chip subtle">{tournament.unique_opponents} oponentes</span>
                    <span className="chip subtle">{tournament.file_date || "sem data"}</span>
                  </div>
                  <p className="lead-copy">{tournament.window_label}</p>
                  <div className="evidence-strip">
                    {tournament.variants_played.map((item) => (
                      <span className="chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="evidence-strip">
                    <span className="chip subtle">{tournament.source_file}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-title">
              <p className="eyebrow">Perfis dos oponentes</p>
              <h2>Scouting de quem mais apareceu nos arquivos</h2>
            </div>
            <div className="cards-grid opponents-grid">
              {analysis.opponents.map((opponent) => (
                <article className="opponent-card" key={opponent.name}>
                  <div className="card-heading">
                    <div>
                      <h3>{opponent.name}</h3>
                      <p>
                        {opponent.hands_with_hero} maos com hero
                        {opponent.tournaments_with_hero > 0
                          ? ` - ${opponent.tournaments_with_hero} torneios`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <p className="lead-copy">{opponent.read}</p>
                  <div className="evidence-strip">
                    {opponent.most_seen_variant ? (
                      <span className="chip">{opponent.most_seen_variant}</span>
                    ) : null}
                    <span className="chip subtle">{opponent.sample_size} maos detalhadas</span>
                    <span className="chip subtle">VPIP {toPercent(opponent.vpip_rate)}</span>
                    <span className="chip subtle">Win {toPercent(opponent.win_rate)}</span>
                    <span className="chip subtle">Showdown {toPercent(opponent.showdown_rate)}</span>
                  </div>
                  <div className="detail-columns compact">
                    <div>
                      <h4>Ameacas</h4>
                      <ul>
                        {opponent.threats.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Oportunidades</h4>
                      <ul>
                        {opponent.opportunities.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="evidence-strip">
                    {opponent.games.map((item) => (
                      <span className="chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="evidence-strip">
                    {opponent.variant_mix.map((item) => (
                      <span className="chip subtle" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-title">
              <p className="eyebrow">Arquivos lidos</p>
              <h2>Resumo de ingestao</h2>
            </div>
            <div className="cards-grid file-grid">
              {analysis.files.map((file) => (
                <article className="file-card" key={file.name}>
                  <div className="card-heading">
                    <div>
                      <h3>{file.name}</h3>
                      <p>
                        {file.records} registros, {file.target_mentions} mencoes da biawhite
                      </p>
                    </div>
                  </div>
                  <ul>
                    {file.notes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="evidence-strip">
                    {file.detected_players.map((item) => (
                      <span className="chip subtle" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
