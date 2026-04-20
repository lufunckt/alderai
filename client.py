"""Client model for the CRM dashboard."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from backend.models.base import Base


class Client(Base):
    __tablename__ = "crm_clients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("crm_users.id"), nullable=False, index=True)
    name = Column(String(160), nullable=False, index=True)
    service = Column(String(180), nullable=True)
    status = Column(String(80), nullable=False, default="Ativo")
    contact = Column(String(180), nullable=True)
    tag = Column(String(120), nullable=True)
    color = Column(String(16), nullable=False, default="#ff7b72")
    accent = Column(String(16), nullable=False, default="#6dd3ff")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="clients")
    payments = relationship("Payment", back_populates="client", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name}>"
