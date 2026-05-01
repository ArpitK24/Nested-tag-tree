import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import TagView from './components/TagView';
import { treeApi, extractTreeProperties } from './api';
import { TagNode, TreeResponse, initialTreeData } from './types';

function App() {
  const [trees, setTrees] = useState<TreeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Per-tree exported JSON state: { [treeId]: jsonString }
  const [exportedJsonMap, setExportedJsonMap] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ id: number; status: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTrees();
  }, []);

  const loadTrees = async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedTrees = await treeApi.getAllTrees();
      if (loadedTrees.length === 0) {
        // No trees saved yet — save the initial example tree from the PDF
        const newTree = await treeApi.createTree({
          name: 'Tree',
          data: initialTreeData,
        });
        setTrees([newTree]);
      } else {
        setTrees(loadedTrees);
      }
    } catch (err) {
      console.error('Failed to load trees:', err);
      setError('Backend unreachable — showing default data. Start the backend to persist changes.');
      setTrees([{ id: 0, name: 'Tree', data: initialTreeData }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle updates to any node within a specific tree
  const handleTreeUpdate = useCallback((treeId: number, updatedNode: TagNode) => {
    setTrees(prev =>
      prev.map(t => (t.id === treeId ? { ...t, data: updatedNode } : t))
    );
  }, []);

  // Export: display JSON below the tree AND save/update to backend
  const handleExport = async (treeId: number) => {
    const tree = trees.find(t => t.id === treeId);
    if (!tree) return;

    const cleanTree = extractTreeProperties(tree.data);
    const jsonString = JSON.stringify(cleanTree, null, 2);
    setExportedJsonMap(prev => ({ ...prev, [treeId]: jsonString }));

    setSavingId(treeId);
    setSaveStatus(null);
    try {
      if (treeId === 0) {
        // Was using fallback id — try creating for real
        const created = await treeApi.createTree({ name: tree.name, data: cleanTree });
        setTrees(prev => prev.map(t => (t.id === 0 ? { ...created } : t)));
        setExportedJsonMap(prev => {
          const updated = { ...prev, [created.id]: jsonString };
          delete updated[0];
          return updated;
        });
      } else {
        await treeApi.updateTree(treeId, { name: tree.name, data: cleanTree });
      }
      setSaveStatus({ id: treeId, status: 'success' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to save tree:', err);
      setSaveStatus({ id: treeId, status: 'error' });
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

  // Add a brand new blank tree
  const handleAddTree = async () => {
    const blankTree: TagNode = { name: 'root', data: 'Data' };
    try {
      const created = await treeApi.createTree({ name: 'New Tree', data: blankTree });
      setTrees(prev => [...prev, created]);
    } catch {
      // Offline fallback
      setTrees(prev => [
        ...prev,
        { id: Date.now() * -1, name: 'New Tree', data: blankTree },
      ]);
    }
  };

  // Delete a tree
  const handleDeleteTree = async (treeId: number) => {
    try {
      if (treeId > 0) await treeApi.deleteTree(treeId);
    } catch {
      /* ignore */
    }
    setTrees(prev => prev.filter(t => t.id !== treeId));
    setExportedJsonMap(prev => {
      const next = { ...prev };
      delete next[treeId];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading trees…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Nested Tags Tree</h1>
            <p className="text-gray-500 mt-1">Build and manage hierarchical tag structures</p>
          </div>
          <button
            onClick={handleAddTree}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Tree
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 text-sm">{error}</p>
          </div>
        )}

        {/* ── Trees ── */}
        <div className="space-y-8">
          {trees.map(tree => (
            <div key={tree.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">

              {/* Tree title bar */}
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {tree.name}{tree.id > 0 ? ` #${tree.id}` : ''}
                </span>
                <button
                  onClick={() => handleDeleteTree(tree.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Delete tree
                </button>
              </div>

              {/* TagView */}
              <div className="p-4">
                <TagView
                  node={tree.data}
                  onUpdate={updatedNode => handleTreeUpdate(tree.id, updatedNode)}
                />
              </div>

              {/* Export button + inline JSON output — matches the spec screenshot layout */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => handleExport(tree.id)}
                  disabled={savingId === tree.id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {savingId === tree.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Export
                </button>

                {exportedJsonMap[tree.id] && (
                  <pre className="mt-3 bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {exportedJsonMap[tree.id]}
                  </pre>
                )}

                {saveStatus?.id === tree.id && (
                  <div className={`mt-2 flex items-center gap-2 text-sm ${
                    saveStatus.status === 'success' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {saveStatus.status === 'success' ? (
                      <><CheckCircle className="w-4 h-4" /> Saved to database</>
                    ) : (
                      <><AlertCircle className="w-4 h-4" /> Failed to save</>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>

        {/* ── Instructions ── */}
        <div className="mt-10 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm">How to use</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click <strong>v</strong> / <strong>&gt;</strong> to collapse or expand a tag</li>
            <li>• Click a <strong>tag name</strong> to rename it — press Enter to confirm</li>
            <li>• Edit the <strong>Data</strong> text field to change leaf values</li>
            <li>• Click <strong>Add Child</strong> to add a nested child tag (converts leaf → parent)</li>
            <li>• Click <strong>Export</strong> to display the JSON and save to the database</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default App;
