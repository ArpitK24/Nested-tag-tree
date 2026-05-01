"""
Main FastAPI application for Nested Tags Tree backend.
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import engine, get_db, Base
from .models import TreeNode
from .schemas import TreeCreate, TreeUpdate, TreeResponse, TreeListResponse

# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nested Tags Tree API",
    description="Backend API for managing nested tag tree hierarchies",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Nested Tags Tree API", "version": "1.0.0"}


@app.get("/api/trees", response_model=TreeListResponse)
def get_all_trees(db: Session = Depends(get_db)):
    """
    GET /api/trees
    Returns all saved tree hierarchies ordered newest first.
    The frontend calls this on load and displays each tree below the other.
    """
    trees = db.query(TreeNode).order_by(TreeNode.created_at.asc()).all()
    return {"trees": trees}


@app.get("/api/trees/{tree_id}", response_model=TreeResponse)
def get_tree(tree_id: int, db: Session = Depends(get_db)):
    """GET /api/trees/{id} — fetch a specific tree."""
    tree = db.query(TreeNode).filter(TreeNode.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Tree with id {tree_id} not found")
    return tree


@app.post("/api/trees", response_model=TreeResponse, status_code=status.HTTP_201_CREATED)
def create_tree(tree_data: TreeCreate, db: Session = Depends(get_db)):
    """
    POST /api/trees
    Save a new tree hierarchy record to the database.
    The tree JSON is stored as a single JSON column — the most suitable schema
    for a recursive, variable-depth structure that is always read/written atomically.
    """
    db_tree = TreeNode(
        name=tree_data.name,
        data=tree_data.data.model_dump(exclude_none=True),
    )
    db.add(db_tree)
    db.commit()
    db.refresh(db_tree)
    return db_tree


@app.put("/api/trees/{tree_id}", response_model=TreeResponse)
def update_tree(tree_id: int, tree_data: TreeUpdate, db: Session = Depends(get_db)):
    """
    PUT /api/trees/{id}
    Update an existing tree hierarchy (called by Export when a tree was already saved).
    """
    db_tree = db.query(TreeNode).filter(TreeNode.id == tree_id).first()
    if not db_tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Tree with id {tree_id} not found")

    if tree_data.name is not None:
        db_tree.name = tree_data.name
    if tree_data.data is not None:
        db_tree.data = tree_data.data.model_dump(exclude_none=True)

    db.commit()
    db.refresh(db_tree)
    return db_tree


@app.delete("/api/trees/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tree(tree_id: int, db: Session = Depends(get_db)):
    """DELETE /api/trees/{id} — remove a tree hierarchy."""
    db_tree = db.query(TreeNode).filter(TreeNode.id == tree_id).first()
    if not db_tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Tree with id {tree_id} not found")
    db.delete(db_tree)
    db.commit()
    return None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
