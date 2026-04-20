import { FormEvent, useState } from "react";
import { addNote } from "../api/client";

const initialForm = {
  player_id: 0,
  title: "",
  content: "",
  tags: ""
};

export default function AddNotePage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(undefined);

    try {
      await addNote({
        ...form,
        player_id: Number(form.player_id),
        tags: form.tags || undefined
      });
      setStatus("success");
      setMessage("Note saved. You can add another or link a spot to it.");
      setForm(initialForm);
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  }

  return (
    <section className="page-card">
      <h2>Add note</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label htmlFor="player-id">Player ID</label>
        <input
          id="player-id"
          type="number"
          min={1}
          value={form.player_id}
          onChange={(event) => setForm({ ...form, player_id: Number(event.target.value) })}
          required
        />

        <label htmlFor="note-title">Title</label>
        <input
          id="note-title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
        />

        <label htmlFor="note-content">Content</label>
        <textarea
          id="note-content"
          rows={5}
          value={form.content}
          onChange={(event) => setForm({ ...form, content: event.target.value })}
          required
        />

        <label htmlFor="note-tags">Tags</label>
        <input
          id="note-tags"
          placeholder="e.g. gambit, tournament, mixed"
          value={form.tags}
          onChange={(event) => setForm({ ...form, tags: event.target.value })}
        />

        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving…" : "Save note"}
        </button>
      </form>

      {message && (
        <p className={status === "error" ? "error-chip" : "success-chip"}>{message}</p>
      )}
    </section>
  );
}
