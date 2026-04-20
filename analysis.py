"""Schemas for tournament file ingestion and scouting analysis."""

from typing import List, Literal

from pydantic import BaseModel, Field


class TournamentFileInput(BaseModel):
    name: str
    content: str
    encoding: Literal["text", "base64"] = "base64"


class TournamentAnalysisRequest(BaseModel):
    target_player: str = Field(default="biawhite", min_length=2)
    files: List[TournamentFileInput]


class AnalysisMetrics(BaseModel):
    files_processed: int
    extracted_records: int
    target_records: int
    tournaments: int
    modalities: int
    opponents: int
    confidence: str
    source_notes: List[str] = []


class PlayerProfile(BaseModel):
    player_name: str
    overview: str
    sample_size: int
    primary_style: str
    vpip_rate: float
    win_rate: float
    showdown_rate: float
    strengths: List[str]
    leaks: List[str]
    adjustments: List[str]
    dominant_modalities: List[str]
    evidence: List[str]


class ModalityProfile(BaseModel):
    name: str
    sample_size: int
    confidence: str
    style: str
    vpip_rate: float
    win_rate: float
    showdown_rate: float
    early_fold_rate: float
    strengths: List[str]
    risks: List[str]
    adjustments: List[str]
    opponents: List[str]
    evidence: List[str]


class OpponentProfile(BaseModel):
    name: str
    sample_size: int
    hands_with_hero: int
    tournaments_with_hero: int
    most_seen_variant: str
    variant_mix: List[str]
    games: List[str]
    read: str
    vpip_rate: float
    win_rate: float
    showdown_rate: float
    threats: List[str]
    opportunities: List[str]
    evidence: List[str]


class IngestedFileSummary(BaseModel):
    name: str
    records: int
    target_mentions: int
    detected_players: List[str]
    notes: List[str]


class TournamentSummary(BaseModel):
    tournament_id: str
    file_date: str
    buy_in_text: str
    hands: int
    unique_opponents: int
    variants_played: List[str]
    first_hand_brt: str
    last_hand_brt: str
    source_file: str
    window_label: str


class TournamentAnalysisResponse(BaseModel):
    metrics: AnalysisMetrics
    player_profile: PlayerProfile
    modalities: List[ModalityProfile]
    opponents: List[OpponentProfile]
    tournaments: List[TournamentSummary]
    files: List[IngestedFileSummary]
    discovered_players: List[str]
