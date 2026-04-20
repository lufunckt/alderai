import { FormEvent, useState } from "react";
import { addSpot } from "../api/client";

const initialForm = {
  player_id: 0,
  hand_history: "",
  game_type: "8-Game",
  stakes: "",
  key_takeaways: "",
  note_id: "",
  date_played: ""
};

export default function AddSpotPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(undefined);

    try {
      await addSpot({
        player_id: Number(form.player_id),
        hand_history: form.hand_history,
        game_type: form.game_type,
        stakes: form.stakes || undefined,
        key_takeaways: form.key_takeaways || undefined,
        note_id: form.note_id ? Number(form.note_id) : undefined,
        date_played: form.date_played || undefined
      });
      setStatus("success");
      setMessage("Spot recorded. You can keep tracking hands per player.");
      setForm(initialForm);
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  }

  return (
    <section className="page-card">
      <h2>Add spot (hand reflection)</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label htmlFor="spot-player-id">Player ID</label>
        <input
          id="spot-player-id"
          type="number"
          min={1}
          value={form.player_id}
          onChange={(event) => setForm({ ...form, player_id: Number(event.target.value) })}
          required
        />

        <label htmlFor="spot-note-id">Related note ID (optional)</label>
        <input
          id="spot-note-id"
          type="number"
          min={1}
          value={form.note_id}
          onChange={(event) => setForm({ ...form, note_id: event.target.value })}
        />

        <label htmlFor="spot-hand">Hand history</label>
        <textarea
          id="spot-hand"
          rows={4}
          value={form.hand_history}
          onChange={(event) => setForm({ ...form, hand_history: event.target.value })}
          required
        />

        <label htmlFor="spot-game-type">Game type</label>
        <input
          id="spot-game-type"
          value={form.game_type}
          onChange={(event) => setForm({ ...form, game_type: event.target.value })}
        />

        <label htmlFor="spot-stakes">Stakes</label>
        <input
          id="spot-stakes"
          placeholder="e.g. $5/$10 mixed"
          value={form.stakes}
          onChange={(event) => setForm({ ...form, stakes: event.target.value })}
        />

        <label htmlFor="spot-key">Key takeaways</label>
        <textarea
          id="spot-key"
          rows={3}
          value={form.key_takeaways}
          onChange={(event) => setForm({ ...form, key_takeaways: event.target.value })}
        />

        <label htmlFor="spot-date">Date played</label>
        <input
          id="spot-date"
          type="date"
          value={form.date_played}
          onChange={(event) => setForm({ ...form, date_played: event.target.value })}
        />

        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Recording…" : "Record spot"}
        </button>
      </form>

      {message && (
        <p className={status === "error" ? "error-chip" : "success-chip"}>{message}</p>
      )}
    </section>
  );
}
