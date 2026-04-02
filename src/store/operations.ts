import { v4 as uuidv4 } from 'uuid';
import type { TaxonomyNode, PersistedState } from '../types/taxonomy';

export function makeNode(partial: Partial<TaxonomyNode> & { parentId: string | null }): TaxonomyNode {
  const now = Date.now();
  return {
    id: uuidv4(),
    label: 'New node',
    type: 'topic',
    childIds: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function opAddChild(
  state: PersistedState,
  parentId: string,
  partial: Partial<TaxonomyNode> = {}
): { state: PersistedState; newId: string } {
  const parent = state.nodes[parentId];
  if (!parent) return { state, newId: '' };

  const node = makeNode({ type: parent.type, ...partial, parentId });
  const updatedParent: TaxonomyNode = {
    ...parent,
    childIds: [...parent.childIds, node.id],
    updatedAt: Date.now(),
  };

  return {
    state: {
      ...state,
      nodes: { ...state.nodes, [node.id]: node, [parentId]: updatedParent },
    },
    newId: node.id,
  };
}

export function opAddSibling(
  state: PersistedState,
  siblingId: string,
  partial: Partial<TaxonomyNode> = {}
): { state: PersistedState; newId: string } {
  const sibling = state.nodes[siblingId];
  if (!sibling) return { state, newId: '' };

  const node = makeNode({ type: sibling.type, ...partial, parentId: sibling.parentId });

  if (sibling.parentId === null) {
    const idx = state.rootIds.indexOf(siblingId);
    const newRootIds = [...state.rootIds];
    newRootIds.splice(idx + 1, 0, node.id);
    return {
      state: {
        ...state,
        nodes: { ...state.nodes, [node.id]: node },
        rootIds: newRootIds,
      },
      newId: node.id,
    };
  }

  const parent = state.nodes[sibling.parentId];
  const idx = parent.childIds.indexOf(siblingId);
  const newChildIds = [...parent.childIds];
  newChildIds.splice(idx + 1, 0, node.id);

  return {
    state: {
      ...state,
      nodes: {
        ...state.nodes,
        [node.id]: node,
        [parent.id]: { ...parent, childIds: newChildIds, updatedAt: Date.now() },
      },
    },
    newId: node.id,
  };
}

export function opAddRoot(
  state: PersistedState,
  partial: Partial<TaxonomyNode> = {}
): { state: PersistedState; newId: string } {
  const node = makeNode({ type: 'domain', ...partial, parentId: null });
  return {
    state: {
      ...state,
      nodes: { ...state.nodes, [node.id]: node },
      rootIds: [...state.rootIds, node.id],
    },
    newId: node.id,
  };
}

export function opWrapNodes(
  state: PersistedState,
  nodeIds: string[],
  newLabel: string,
  newType: string
): { state: PersistedState; newId: string } | null {
  if (nodeIds.length < 2) return null;

  const nodes = nodeIds.map(id => state.nodes[id]).filter(Boolean);
  if (nodes.length !== nodeIds.length) return null;

  // All must share the same parent
  const parentId = nodes[0]!.parentId;
  if (!nodes.every(n => n.parentId === parentId)) return null;

  const newParent = makeNode({ label: newLabel, type: newType, parentId, childIds: nodeIds });
  const now = Date.now();

  // Update each wrapped node's parentId
  const updatedWrapped = Object.fromEntries(
    nodes.map(n => [n.id, { ...n, parentId: newParent.id, updatedAt: now }])
  );

  let updatedState: PersistedState;

  if (parentId === null) {
    // Replace the first selected node's position in rootIds, remove the rest
    const newRootIds = [...state.rootIds];
    const firstIdx = newRootIds.indexOf(nodeIds[0]!);
    // Remove all selected ids from rootIds
    const filtered = newRootIds.filter(id => !nodeIds.includes(id));
    filtered.splice(firstIdx, 0, newParent.id);
    updatedState = {
      ...state,
      nodes: { ...state.nodes, ...updatedWrapped, [newParent.id]: newParent },
      rootIds: filtered,
    };
  } else {
    const grandParent = state.nodes[parentId];
    const newChildIds = [...grandParent.childIds];
    const firstIdx = newChildIds.indexOf(nodeIds[0]!);
    const filtered = newChildIds.filter(id => !nodeIds.includes(id));
    filtered.splice(firstIdx, 0, newParent.id);
    updatedState = {
      ...state,
      nodes: {
        ...state.nodes,
        ...updatedWrapped,
        [newParent.id]: newParent,
        [parentId]: { ...grandParent, childIds: filtered, updatedAt: now },
      },
    };
  }

  return { state: updatedState, newId: newParent.id };
}

export function opReparentNode(
  state: PersistedState,
  nodeId: string,
  newParentId: string | null,
  insertIndex?: number
): PersistedState {
  const node = state.nodes[nodeId];
  if (!node) return state;

  // Prevent dropping into own descendants
  if (newParentId !== null) {
    const descendants = getDescendantIds(state, nodeId);
    if (descendants.includes(newParentId) || newParentId === nodeId) return state;
  }

  let nodes = { ...state.nodes };
  let rootIds = [...state.rootIds];
  const now = Date.now();

  // Remove from old parent
  if (node.parentId === null) {
    rootIds = rootIds.filter(id => id !== nodeId);
  } else {
    const oldParent = nodes[node.parentId];
    if (oldParent) {
      nodes[node.parentId] = {
        ...oldParent,
        childIds: oldParent.childIds.filter(id => id !== nodeId),
        updatedAt: now,
      };
    }
  }

  // Add to new parent
  if (newParentId === null) {
    const idx = insertIndex ?? rootIds.length;
    rootIds.splice(idx, 0, nodeId);
  } else {
    const newParent = nodes[newParentId];
    if (!newParent) return state;
    const newChildIds = [...newParent.childIds];
    const idx = insertIndex ?? newChildIds.length;
    newChildIds.splice(idx, 0, nodeId);
    nodes[newParentId] = { ...newParent, childIds: newChildIds, updatedAt: now };
  }

  nodes[nodeId] = { ...node, parentId: newParentId, updatedAt: now };

  return { ...state, nodes, rootIds };
}

export function opDeleteNode(
  state: PersistedState,
  nodeId: string,
  deleteDescendants: boolean
): PersistedState {
  const node = state.nodes[nodeId];
  if (!node) return state;

  let nodes = { ...state.nodes };
  let rootIds = [...state.rootIds];
  const now = Date.now();

  const toRemove = deleteDescendants
    ? [nodeId, ...getDescendantIds(state, nodeId)]
    : [nodeId];

  if (!deleteDescendants) {
    // Promote children to node's parent
    const childIds = [...node.childIds];
    if (node.parentId === null) {
      const idx = rootIds.indexOf(nodeId);
      rootIds.splice(idx, 1, ...childIds);
    } else {
      const parent = nodes[node.parentId];
      if (parent) {
        const childIdx = parent.childIds.indexOf(nodeId);
        const newChildIds = [...parent.childIds];
        newChildIds.splice(childIdx, 1, ...childIds);
        nodes[node.parentId] = { ...parent, childIds: newChildIds, updatedAt: now };
      }
    }
    // Update promoted children's parentId
    for (const childId of childIds) {
      if (nodes[childId]) {
        nodes[childId] = { ...nodes[childId]!, parentId: node.parentId, updatedAt: now };
      }
    }
  } else {
    if (node.parentId === null) {
      rootIds = rootIds.filter(id => id !== nodeId);
    } else {
      const parent = nodes[node.parentId];
      if (parent) {
        nodes[node.parentId] = {
          ...parent,
          childIds: parent.childIds.filter(id => id !== nodeId),
          updatedAt: now,
        };
      }
    }
  }

  for (const id of toRemove) {
    delete nodes[id];
  }

  return { ...state, nodes, rootIds };
}

export function opUpdateNode(
  state: PersistedState,
  nodeId: string,
  patch: Partial<TaxonomyNode>
): PersistedState {
  const node = state.nodes[nodeId];
  if (!node) return state;
  return {
    ...state,
    nodes: {
      ...state.nodes,
      [nodeId]: { ...node, ...patch, updatedAt: Date.now() },
    },
  };
}

export function getAncestorPath(state: PersistedState, nodeId: string): TaxonomyNode[] {
  const path: TaxonomyNode[] = [];
  let current: TaxonomyNode | undefined = state.nodes[nodeId];
  while (current) {
    path.unshift(current);
    current = current.parentId ? state.nodes[current.parentId] : undefined;
  }
  return path;
}

export function getDescendantIds(state: PersistedState, nodeId: string): string[] {
  const result: string[] = [];
  const queue = [...(state.nodes[nodeId]?.childIds ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    const node = state.nodes[id];
    if (node) queue.push(...node.childIds);
  }
  return result;
}
