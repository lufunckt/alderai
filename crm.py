"""DTOs for CRM resources."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PaymentBase(BaseModel):
    description: str = Field(min_length=2, max_length=200)
    due_date: date
    amount: float = Field(gt=0)
    method: str = Field(default="Pix", max_length=80)
    paid: bool = False
    notes: Optional[str] = Field(default=None, max_length=2000)


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(PaymentBase):
    pass


class PaymentRead(PaymentBase):
    id: int
    client_id: int
    paid_at: Optional[date] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ClientBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    service: Optional[str] = Field(default=None, max_length=180)
    status: str = Field(default="Ativo", max_length=80)
    contact: Optional[str] = Field(default=None, max_length=180)
    tag: Optional[str] = Field(default=None, max_length=120)
    color: str = Field(default="#ff7b72", max_length=16)
    accent: str = Field(default="#6dd3ff", max_length=16)
    notes: Optional[str] = Field(default=None, max_length=3000)


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    payments: list[PaymentRead] = []

    model_config = ConfigDict(from_attributes=True)


class DashboardSummary(BaseModel):
    total_clients: int
    total_records: int
    total_received: float
    total_pending: float
    average_ticket: float
