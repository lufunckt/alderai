"""Note CRUD routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.note import Note
from backend.models.player import Player
from backend.schemas.note import NoteCreate, NoteRead

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("", response_model=NoteRead)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)) -> Note:
    player = db.get(Player, payload.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    note = Note(**payload.model_dump(), player=player)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=List[NoteRead])
def list_notes(
    player_id: Optional[int] = Query(None),
    limit: int = Query(25, le=100),
    db: Session = Depends(get_db),
) -> List[Note]:
    query = db.query(Note)
    if player_id:
        query = query.filter(Note.player_id == player_id)
    return query.order_by(Note.created_at.desc()).limit(limit).all()
