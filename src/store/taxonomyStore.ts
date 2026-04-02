import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { TaxonomyStore, TypeDefinition, PersistedState } from '../types/taxonomy';
import {
  opAddChild,
  opAddSibling,
  opAddRoot,
  opWrapNodes,
  opReparentNode,
  opDeleteNode,
  opUpdateNode,
  getAncestorPath as _getAncestorPath,
  getDescendantIds as _getDescendantIds,
} from './operations';
import { SEED_STATE } from './seed';
import { localStorageAdapter } from '../services/persistence';

function toPersistedState(store: TaxonomyStore): PersistedState {
  return {
    nodes: store.nodes,
    rootIds: store.rootIds,
    typeVocabulary: store.typeVocabulary,
  };
}

function persist(state: PersistedState): void {
  void localStorageAdapter.save(state);
}

export const useTaxonomyStore = create<TaxonomyStore>((set, get) => ({
  // DATA — load from localStorage or fall back to seed
  ...SEED_STATE,

  // VIEW STATE
  focusedNodeId: null,
  expandedIds: new Set(['domain-1']),
  selectedIds: new Set(),
  editingNodeId: null,
  activeDetailTab: 'content',

  // OPERATIONS
  addChild: (parentId, partial = {}) => {
    let newId = '';
    set(state => {
      const result = opAddChild(toPersistedState(state as TaxonomyStore), parentId, partial);
      persist(result.state);
      newId = result.newId;
      return result.state;
    });
    return newId;
  },

  addSibling: (siblingId, partial = {}) => {
    let newId = '';
    set(state => {
      const result = opAddSibling(toPersistedState(state as TaxonomyStore), siblingId, partial);
      persist(result.state);
      newId = result.newId;
      return result.state;
    });
    return newId;
  },

  addRoot: (partial = {}) => {
    let newId = '';
    set(state => {
      const result = opAddRoot(toPersistedState(state as TaxonomyStore), partial);
      persist(result.state);
      newId = result.newId;
      return result.state;
    });
    return newId;
  },

  wrapNodes: (nodeIds, newLabel, newType) => {
    let newId: string | null = null;
    set(state => {
      const result = opWrapNodes(toPersistedState(state as TaxonomyStore), nodeIds, newLabel, newType);
      if (!result) return state;
      persist(result.state);
      newId = result.newId;
      return result.state;
    });
    return newId;
  },

  reparentNode: (nodeId, newParentId, insertIndex) => {
    set(state => {
      const next = opReparentNode(toPersistedState(state as TaxonomyStore), nodeId, newParentId, insertIndex);
      persist(next);
      return next;
    });
  },

  deleteNode: (nodeId, deleteDescendants) => {
    set(state => {
      const next = opDeleteNode(toPersistedState(state as TaxonomyStore), nodeId, deleteDescendants);
      persist(next);
      // Clean up view state
      const editingNodeId = state.editingNodeId === nodeId ? null : state.editingNodeId;
      const focusedNodeId = state.focusedNodeId === nodeId ? null : state.focusedNodeId;
      const selectedIds = new Set([...state.selectedIds].filter(id => id !== nodeId));
      return { ...next, editingNodeId, focusedNodeId, selectedIds };
    });
  },

  updateNode: (nodeId, patch) => {
    set(state => {
      const next = opUpdateNode(toPersistedState(state as TaxonomyStore), nodeId, patch);
      persist(next);
      return next;
    });
  },

  // NAVIGATION
  setFocus: (nodeId) => set({ focusedNodeId: nodeId }),

  getAncestorPath: (nodeId) => _getAncestorPath(toPersistedState(get() as unknown as TaxonomyStore), nodeId),

  getDescendantIds: (nodeId) => _getDescendantIds(toPersistedState(get() as unknown as TaxonomyStore), nodeId),

  // VIEW STATE MUTATIONS
  toggleExpanded: (nodeId) =>
    set(state => {
      const next = new Set(state.expandedIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { expandedIds: next };
    }),

  setExpanded: (nodeId, expanded) =>
    set(state => {
      const next = new Set(state.expandedIds);
      if (expanded) next.add(nodeId);
      else next.delete(nodeId);
      return { expandedIds: next };
    }),

  toggleSelected: (nodeId) =>
    set(state => {
      const next = new Set(state.selectedIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { selectedIds: next };
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setEditingNode: (nodeId) => set({ editingNodeId: nodeId }),

  setActiveDetailTab: (tab) => set({ activeDetailTab: tab }),

  // VOCABULARY
  addType: (type) =>
    set(state => {
      const newType: TypeDefinition = { ...type, id: uuidv4(), isDefault: false };
      const typeVocabulary = [...state.typeVocabulary, newType];
      persist({ nodes: state.nodes, rootIds: state.rootIds, typeVocabulary });
      return { typeVocabulary };
    }),

  deleteType: (typeId) =>
    set(state => {
      const typeVocabulary = state.typeVocabulary.filter(t => t.id !== typeId || t.isDefault);
      persist({ nodes: state.nodes, rootIds: state.rootIds, typeVocabulary });
      return { typeVocabulary };
    }),

  updateType: (typeId, patch) =>
    set(state => {
      const typeVocabulary = state.typeVocabulary.map(t => t.id === typeId ? { ...t, ...patch } : t);
      persist({ nodes: state.nodes, rootIds: state.rootIds, typeVocabulary });
      return { typeVocabulary };
    }),

  // PERSISTENCE
  importState: (state) =>
    set({
      ...state,
      focusedNodeId: null,
      expandedIds: new Set(state.rootIds),
      selectedIds: new Set(),
      editingNodeId: null,
      activeDetailTab: 'content',
    }),

  resetToSeed: () =>
    set({
      ...SEED_STATE,
      focusedNodeId: null,
      expandedIds: new Set(['domain-1']),
      selectedIds: new Set(),
      editingNodeId: null,
      activeDetailTab: 'content',
    }),
}));

// Boot: hydrate from localStorage on startup
localStorageAdapter.load().then(saved => {
  if (saved) {
    useTaxonomyStore.setState({
      ...saved,
      expandedIds: new Set(saved.rootIds),
      selectedIds: new Set(),
      editingNodeId: null,
      focusedNodeId: null,
      activeDetailTab: 'content',
    });
  }
});
