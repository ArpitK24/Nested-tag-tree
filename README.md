# Nested Tags Tree

A full-stack web application for building, editing, and persisting hierarchical tag trees.

---


## Database Schema

The most suitable schema for this use case is a **single `trees` table** where each row stores one complete tree hierarchy as a JSON column:

```sql
CREATE TABLE trees (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL DEFAULT 'Tree',
    data       JSON NOT NULL,   -- full recursive tree: {name, children?, data?}
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Why JSON column (not adjacency list / closure table)?**
- The tree is always fetched and written atomically — no partial reads needed.
- The depth is arbitrary and variable; adjacency-list requires N+1 queries or recursive CTEs.
- No cross-tree relational queries are required.
- JSON column is simple, fast, and directly maps to the frontend data structure.

---


## Running Locally

### 1. Backend

```bash
cd nested-tags-tree

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Set database URL (MySQL)
# PowerShell:
$env:DATABASE_URL="mysql+pymysql://root:<password>@103.14.99.198:3306/Nested_tree_DB"

# Start the server
uvicorn backend.main:app --reload --port 8000
```

API is now available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

App is now available at `http://localhost:5173`

> **Vite proxy**: All `/api/*` requests are proxied to `http://localhost:8000` automatically.

### Render Deployment Note
- Set `DATABASE_URL` in Render service environment variables.
- Example:
`mysql+pymysql://root:<password>@103.14.99.198:3306/Nested_tree_DB`
- Do not hardcode DB credentials in repository files.

---

### POST / PUT payload shape
```json
{
  "name": "Tree",
  "data": {
    "name": "root",
    "children": [
      {
        "name": "child1",
        "children": [
          { "name": "child1-child1", "data": "c1-c1 Hello" },
          { "name": "child1-child2", "data": "c1-c2 JS" }
        ]
      },
      { "name": "child2", "data": "c2 World" }
    ]
  }
}
```

---

## Features Implemented

### Frontend
-  Recursive `TagView` component renders arbitrarily deep trees
-  Each node shows `v` (expanded) or `>` (collapsed) button — collapses/expands body
-  **Data** text input shown for leaf nodes; edits update the internal tree state live
-  **Add Child** button on every node; converts leaf → parent, adds "New Child" with data "Data"
-  **Export** button outputs clean JSON (only `name`, `children`, `data`) and saves to backend
-  On load, fetches all saved trees from backend and displays them stacked vertically
-  First load with empty DB seeds the example tree from the assignment PDF
-  Export calls **PUT** if the tree already has a DB ID, **POST** if new
-  **Bonus**: Click any tag name to edit it inline; press Enter to confirm, Escape to cancel

### Backend
-  FastAPI with CORS enabled
-  MySQL database with SQLAlchemy ORM
-  `GET /api/trees` — returns all trees as a list
-  `POST /api/trees` — creates new tree record
-  `PUT /api/trees/{id}` — updates existing tree record
-  `DELETE /api/trees/{id}` — removes a tree
-  Pydantic validation — only `name`/`children`/`data` pass through; extra fields rejected
-  Timestamps (`created_at`, `updated_at`) on every record
