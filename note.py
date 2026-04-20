"""Note DTOs for API requests/responses."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NoteBase(BaseModel):
    player_id: int
    title: str
    content: str
    tags: Optional[str] = None


class NoteCreate(NoteBase):
    pass


class NoteRead(NoteBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
