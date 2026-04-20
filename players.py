"""Player CRUD routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.player import Player
from backend.schemas.player import PlayerCreate, PlayerRead

router = APIRouter(prefix="/players", tags=["players"])


def _attach_notes_count(player: Player) -> Player:
    player.notes_count = len(player.notes)
    return player


@router.post("", response_model=PlayerRead)
def create_player(payload: PlayerCreate, db: Session = Depends(get_db)) -> Player:
    player = Player(name=payload.name, email=payload.email)
    db.add(player)
    db.commit()
    db.refresh(player)
    return _attach_notes_count(player)


@router.get("", response_model=List[PlayerRead])
def list_players(
    q: Optional[str] = Query(None, title="Search term", description="Filter players by name substring"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
) -> List[Player]:
    query = db.query(Player)
    if q:
        query = query.filter(Player.name.ilike(f"%{q}%"))
    players = query.order_by(Player.created_at.desc()).limit(limit).all()
    return [_attach_notes_count(player) for player in players]


@router.get("/{player_id}", response_model=PlayerRead)
def get_player(player_id: int, db: Session = Depends(get_db)) -> Player:
    player = db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return _attach_notes_count(player)
