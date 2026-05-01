"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, model_validator
from typing import List, Optional
from datetime import datetime


class TreeNodeSchema(BaseModel):
    """
    Schema for a single tree node.
    Enforces the spec constraint: a node must have either 'children' OR 'data', never both.
    """
    name: str
    children: Optional[List['TreeNodeSchema']] = None
    data: Optional[str] = None

    class Config:
        extra = "forbid"  # Reject any extra fields so internal IDs never leak

    @model_validator(mode='after')
    def children_xor_data(self) -> 'TreeNodeSchema':
        """
        Enforce mutual exclusion: a node cannot have both children and data.
        A node with children is a parent; a node with data is a leaf.
        """
        has_children = self.children is not None and len(self.children) > 0
        has_data = self.data is not None
        if has_children and has_data:
            raise ValueError(
                f"Node '{self.name}' is invalid: a node cannot have both "
                "'children' and 'data'. It must be either a parent (children) "
                "or a leaf (data), not both."
            )
        return self


class TreeCreate(BaseModel):
    """Payload for POST /api/trees"""
    name: str = "Tree"
    data: TreeNodeSchema


class TreeUpdate(BaseModel):
    """Payload for PUT /api/trees/{id}"""
    name: Optional[str] = None
    data: Optional[TreeNodeSchema] = None


class TreeResponse(BaseModel):
    """Response shape for a single tree record."""
    id: int
    name: str
    data: TreeNodeSchema
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TreeListResponse(BaseModel):
    """Response shape for GET /api/trees"""
    trees: List[TreeResponse]


# Resolve forward references
TreeNodeSchema.model_rebuild()
