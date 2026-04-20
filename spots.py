"""Spot CRUD routes for recording hand histories."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.note import Note
from backend.models.player import Player
from backend.models.spot import Spot
from backend.schemas.spot import SpotCreate, SpotRead

router = APIRouter(prefix="/spots", tags=["spots"])


@router.post("", response_model=SpotRead)
def create_spot(payload: SpotCreate, db: Session = Depends(get_db)) -> Spot:
    player = db.get(Player, payload.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if payload.note_id:
        linked_note = db.get(Note, payload.note_id)
        if not linked_note:
            raise HTTPException(status_code=404, detail="Linked note not found")
    else:
        linked_note = None

    spot = Spot(**payload.model_dump(), player=player, note=linked_note)
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot


@router.get("", response_model=List[SpotRead])
def list_spots(
    player_id: Optional[int] = Query(None),
    limit: int = Query(25, le=100),
    db: Session = Depends(get_db),
) -> List[Spot]:
    query = db.query(Spot)
    if player_id:
        query = query.filter(Spot.player_id == player_id)
    return query.order_by(Spot.created_at.desc()).limit(limit).all()
