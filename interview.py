"""DTOs for the interview response assistant."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class InterviewTurn(BaseModel):
    question_it: str = Field(min_length=2, max_length=4000)
    answer_it: str = Field(min_length=2, max_length=6000)


class InterviewContext(BaseModel):
    company_name: str = Field(default="Agentify", max_length=160)
    role_title: str = Field(default="Telesales in italiano", max_length=220)
    job_context: str = Field(
        default=(
            "Vendita consultiva in italiano di prodotti farmaceutici e supplementi, "
            "lavoro remoto, focus su ascolto, follow-up e risultati."
        ),
        max_length=12000,
    )
    candidate_summary: str = Field(
        default=(
            "Sono farmacista in formazione e ho esperienza in telesales, customer communication, "
            "supporto amministrativo remoto e ambienti health-tech. Ho lavorato con outbound calling, "
            "qualificazione lead, follow-up e spiegazione chiara di servizi e strumenti digitali. "
            "Porto anche esperienza in ricerca scientifica, bioinformatica e organizzazione di informazioni complesse."
        ),
        max_length=12000,
    )
    strengths: list[str] = Field(
        default_factory=lambda: [
            "comunicazione chiara ed empatica",
            "gestione di follow-up e CRM",
            "gestione obiezioni e contatto telefonico",
            "disciplina nel lavoro remoto",
            "base sanitaria e scientifica",
        ],
        max_length=10,
    )
    tone: str = Field(default="Confiante, naturale e calma", max_length=240)
    answer_style: Literal["breve", "equilibrada", "detalhada"] = "equilibrada"
    extra_instructions: str | None = Field(default=None, max_length=2000)


class InterviewReplyRequest(BaseModel):
    transcript: str = Field(min_length=2, max_length=4000)
    history: list[InterviewTurn] = Field(default_factory=list, max_length=6)
    context: InterviewContext = Field(default_factory=InterviewContext)


class InterviewReplyResponse(BaseModel):
    mode: Literal["ai", "fallback"]
    detected_intent: str
    cleaned_transcript: str
    answer_it: str
    answer_pt: str
    coaching_tip: str
