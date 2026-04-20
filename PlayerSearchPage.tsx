import { useState } from "react";
import { fetchPlayers, PlayerListItem } from "../api/client";

export default function PlayerSearchPage() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSearch() {
    setLoading(true);
    setError(undefined);
    try {
      const results = await fetchPlayers(query);
      setPlayers(results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-card">
      <h2>Player search</h2>
      <div className="field-grid">
        <label htmlFor="player-search">Name search</label>
        <input
          id="player-search"
          placeholder="e.g. Jonny, Maria, 9-game"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching…" : "Find players"}
        </button>
      </div>

      {error && <p className="error-chip">{error}</p>}

      <div>
        {players.length === 0 ? (
          <p>No players yet. Try searching or add a player via API.</p>
        ) : (
          <div className="player-list">
            {players.map((player) => (
              <article className="player-card" key={player.id}>
                <div className="player-card__header">
                  <h3>{player.name}</h3>
                  <span className="success-chip">
                    {player.notes_count} note{player.notes_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="player-card__meta">
                  <strong>Email:</strong> {player.email ?? "—"}
                </p>
                <p className="player-card__meta">
                  <strong>Joined:</strong> {new Date(player.created_at).toLocaleDateString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
