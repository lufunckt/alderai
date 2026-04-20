"""Minimal FastAPI beta for health-check only."""

from fastapi import FastAPI

app = FastAPI(title="Poker Study (beta)", version="0.1")


@app.get("/health")
def health():
    return {"status": "ok", "service": app.title}
