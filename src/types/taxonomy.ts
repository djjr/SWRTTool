export interface TaxonomyNode {
  id: string;
  label: string;
  description?: string;
  examples?: string[];
  links?: Array<{ label: string; url: string }>;
  type: string;
  parentId: string | null;
  childIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TypeDefinition {
  id: string;
  label: string;
  color: string;
  isDefault: boolean;
}

export interface TaxonomyStore {
  // DATA
  nodes: Record<string, TaxonomyNode>;
  rootIds: string[];
  typeVocabulary: TypeDefinition[];

  // VIEW STATE
  focusedNodeId: string | null;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  editingNodeId: string | null;        // which node has the detail panel open
  inlineEditingNodeId: string | null;  // which node has the inline label editor active
  activeDetailTab: 'content' | 'ai';

  // OPERATIONS
  addChild: (parentId: string, partial?: Partial<TaxonomyNode>) => string;
  addSibling: (siblingId: string, partial?: Partial<TaxonomyNode>) => string;
  addRoot: (partial?: Partial<TaxonomyNode>) => string;
  wrapNodes: (nodeIds: string[], newLabel: string, newType: string) => string | null;
  reparentNode: (nodeId: string, newParentId: string | null, insertIndex?: number) => void;
  deleteNode: (nodeId: string, deleteDescendants: boolean) => void;
  updateNode: (nodeId: string, patch: Partial<TaxonomyNode>) => void;

  // NAVIGATION
  setFocus: (nodeId: string | null) => void;
  getAncestorPath: (nodeId: string) => TaxonomyNode[];
  getDescendantIds: (nodeId: string) => string[];

  // VIEW STATE MUTATIONS
  toggleExpanded: (nodeId: string) => void;
  setExpanded: (nodeId: string, expanded: boolean) => void;
  toggleSelected: (nodeId: string) => void;
  clearSelection: () => void;
  setEditingNode: (nodeId: string | null) => void;
  setInlineEditingNode: (nodeId: string | null) => void;
  setActiveDetailTab: (tab: 'content' | 'ai') => void;

  // VOCABULARY
  addType: (type: Omit<TypeDefinition, 'isDefault' | 'id'>) => void;
  deleteType: (typeId: string) => void;
  updateType: (typeId: string, patch: Partial<TypeDefinition>) => void;

  // PERSISTENCE
  importState: (state: PersistedState) => void;
  resetToSeed: () => void;
}

export interface PersistedState {
  nodes: Record<string, TaxonomyNode>;
  rootIds: string[];
  typeVocabulary: TypeDefinition[];
}

export type AIRequest =
  | SuggestChildrenRequest
  | SuggestGroupingRequest
  | SuggestSiblingsRequest;

export interface SuggestChildrenRequest {
  action: 'suggest_children';
  node: Pick<TaxonomyNode, 'label' | 'description' | 'type'>;
  existingChildren: string[];
  vocabularyContext: string[];
}

export interface SuggestGroupingRequest {
  action: 'suggest_grouping';
  siblings: Pick<TaxonomyNode, 'label' | 'type'>[];
  parentContext: Pick<TaxonomyNode, 'label' | 'type'> | null;
}

export interface SuggestSiblingsRequest {
  action: 'suggest_siblings';
  node: Pick<TaxonomyNode, 'label' | 'description' | 'type'>;
  existingSiblings: string[];
  parentContext: Pick<TaxonomyNode, 'label' | 'type'> | null;
}

export interface AIAssistResponse {
  suggestions: Array<{
    label: string;
    type: string;
    rationale: string;
  }>;
}
