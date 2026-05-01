"""
SQLAlchemy models for the Nested Tags Tree application.
Most suitable schema: store the entire tree as a single JSON column.
This is the best approach because:
  - The tree structure is arbitrarily deep and recursive
  - No cross-tree relational queries are needed
  - Avoids complex adjacency-list/closure-table joins for reads/writes
  - The whole tree is always fetched and updated atomically
"""
import json
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import text
from sqlalchemy.types import TypeDecorator
from .database import Base


class JSONText(TypeDecorator):
    """
    Store dict/list JSON as TEXT for broad MySQL/MariaDB compatibility.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(value)


class TreeNode(Base):
    """Stores one complete tree hierarchy per row."""
    __tablename__ = "trees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), default="Tree", nullable=False)
    # The complete recursive tree structure stored as JSON.
    # Schema: { name, children?: [...], data?: string }
    data = Column(JSONText, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
