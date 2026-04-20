"""Payment or receivable line item for a client."""

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from backend.models.base import Base


class Payment(Base):
    __tablename__ = "crm_payments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("crm_clients.id"), nullable=False, index=True)
    description = Column(String(200), nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    method = Column(String(80), nullable=False, default="Pix")
    paid = Column(Boolean, nullable=False, default=False)
    paid_at = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("Client", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} client_id={self.client_id} amount={self.amount}>"
