import axios from 'axios';
import { TreeData, TreeResponse, TreeListResponse, TagNode } from './types';

const normalizeApiBaseUrl = (value?: string): string => {
  const raw = (value || "").trim();
  if (!raw) return "/api";
  if (raw.startsWith("/")) return raw.replace(/\/+$/, "");
  const cleaned = raw.replace(/\/+$/, "");
  if (cleaned.endsWith("/api")) return cleaned;
  return `${cleaned}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const treeApi = {
  getAllTrees: async (): Promise<TreeResponse[]> => {
    const response = await api.get<TreeListResponse>('/trees');
    return response.data.trees;
  },

  getTree: async (id: number): Promise<TreeResponse> => {
    const response = await api.get<TreeResponse>(`/trees/${id}`);
    return response.data;
  },

  createTree: async (tree: TreeData): Promise<TreeResponse> => {
    const response = await api.post<TreeResponse>('/trees', tree);
    return response.data;
  },

  updateTree: async (id: number, tree: Partial<TreeData>): Promise<TreeResponse> => {
    const response = await api.put<TreeResponse>(`/trees/${id}`, tree);
    return response.data;
  },

  deleteTree: async (id: number): Promise<void> => {
    await api.delete(`/trees/${id}`);
  },
};

/**
 * Recursively extract only name, children, data — strips null values and any
 * internal fields so the exported JSON is clean.
 * Handles null vs undefined from the backend JSON serialization.
 */
export const extractTreeProperties = (node: TagNode): TagNode => {
  const result: TagNode = { name: node.name };

  // Treat both null and undefined as "no children"
  if (node.children != null && node.children.length > 0) {
    result.children = node.children.map(child => extractTreeProperties(child));
  } else if (node.data != null) {
    // Only set data if it's a real string value (not null/undefined)
    result.data = node.data;
  }

  return result;
};

export default api;
