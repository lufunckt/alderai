"""Spot DTOs for hand history entries."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SpotBase(BaseModel):
    player_id: int
    hand_history: str
    game_type: str = "8-Game"
    stakes: Optional[str] = None
    key_takeaways: Optional[str] = None
    note_id: Optional[int] = None
    date_played: Optional[datetime] = None


class SpotCreate(SpotBase):
    pass


class SpotRead(SpotBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
