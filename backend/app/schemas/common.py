from pydantic import BaseModel


class Page[ItemT](BaseModel):
    items: list[ItemT]
    total: int
    page: int
    page_size: int


class ErrorResponse(BaseModel):
    code: str
    detail: str
