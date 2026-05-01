import React, { useState, useRef, useEffect } from 'react';
import { TagNode } from '../types';

interface TagViewProps {
  node: TagNode;
  onUpdate: (updatedNode: TagNode) => void;
  level?: number;
}

const TagView: React.FC<TagViewProps> = ({ node, onUpdate, level = 0 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(node.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(node.name);
  }, [node.name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // ── Bonus: Name editing ──────────────────────────────────────
  const handleNameClick = () => {
    setEditedName(node.name);
    setIsEditingName(true);
  };

  const commitName = () => {
    const trimmed = editedName.trim() || node.name;
    setIsEditingName(false);
    if (trimmed !== node.name) {
      onUpdate({ ...node, name: trimmed });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') {
      setEditedName(node.name);
      setIsEditingName(false);
    }
  };

  // ── Data editing ─────────────────────────────────────────────
  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...node, data: e.target.value });
  };

  // ── Add Child ────────────────────────────────────────────────
  const handleAddChild = () => {
    const newChild: TagNode = { name: 'New Child', data: 'Data' };
    // Build updated node: always has children, never data (leaf → parent conversion)
    const updatedNode: TagNode = {
      name: node.name,
      // If already has children (non-null), append; otherwise start fresh
      children: (node.children != null && node.children.length > 0)
        ? [...node.children, newChild]
        : [newChild],
    };
    onUpdate(updatedNode);
  };

  // ── Child updates ────────────────────────────────────────────
  const handleChildUpdate = (index: number, updatedChild: TagNode) => {
    const updatedChildren = [...(node.children ?? [])];
    updatedChildren[index] = updatedChild;
    onUpdate({ ...node, children: updatedChildren });
  };

  // Treat null the same as undefined/missing — backend returns null for absent fields
  const hasChildren = node.children != null && node.children.length > 0;
  const hasData = node.data != null;

  return (
    <div className="tag-view" style={{ paddingLeft: level > 0 ? `${level * 20}px` : '0' }}>

      {/* ── Header bar ── */}
      <div className="tag-header">

        {/* Collapse / Expand — spec requires literal "v" or ">" */}
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(c => !c)}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '>' : 'v'}
        </button>

        {/* Tag name — click to edit (Bonus requirement) */}
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editedName}
            onChange={e => setEditedName(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            className="name-edit-input"
            aria-label="Edit tag name"
          />
        ) : (
          <span
            className="tag-name"
            onClick={handleNameClick}
            title="Click to rename"
          >
            {node.name}
          </span>
        )}

        {/* Add Child button — spec requires text "Add Child" */}
        <button className="add-child-btn" onClick={handleAddChild}>
          Add Child
        </button>
      </div>

      {/* ── Body (hidden when collapsed) ── */}
      {!isCollapsed && (
        <div className="tag-body">

          {/* Data input — shown only for leaf nodes (no children) */}
          {!hasChildren && hasData && (
            <div className="data-row">
              <span className="data-label">Data</span>
              <input
                type="text"
                value={node.data as string}
                onChange={handleDataChange}
                placeholder="Enter data..."
                className="data-input"
                aria-label={`Data for ${node.name}`}
              />
            </div>
          )}

          {/* Children — recursive TagView instances */}
          {hasChildren && (
            <div className="children-list">
              {node.children!.map((child, index) => (
                <TagView
                  key={`${child.name}-${index}`}
                  node={child}
                  onUpdate={updatedChild => handleChildUpdate(index, updatedChild)}
                  level={level + 1}
                />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default TagView;
