"""Player-facing DTOs."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class PlayerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None


class PlayerCreate(PlayerBase):
    pass


class PlayerRead(PlayerBase):
    id: int
    created_at: datetime
    notes_count: int = 0

    model_config = ConfigDict(from_attributes=True)
