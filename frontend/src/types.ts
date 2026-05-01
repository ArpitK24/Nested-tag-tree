// Types for the Tag Tree structure
export interface TagNode {
  name: string;
  children?: TagNode[] | null;
  data?: string | null;
}

export interface TreeData {
  id?: number;
  name: string;
  data: TagNode;
}

export interface TreeResponse {
  id: number;
  name: string;
  data: TagNode;
  created_at?: string;
  updated_at?: string;
}

export interface TreeListResponse {
  trees: TreeResponse[];
}

// Initial tree structure from the PDF example
export const initialTreeData: TagNode = {
  name: 'root',
  children: [
    {
      name: 'child1',
      children: [
        { name: 'child1-child1', data: 'c1-c1 Hello' },
        { name: 'child1-child2', data: 'c1-c2 JS' }
      ]
    },
    { name: 'child2', data: 'c2 World' }
  ]
};
