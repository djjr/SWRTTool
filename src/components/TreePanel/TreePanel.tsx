import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import styles from './TreePanel.module.css';
import { NodeList } from './NodeList';
import { useTaxonomyStore } from '../../store/taxonomyStore';
import { TypeBadge } from '../TypeBadge/TypeBadge';

type DropPosition = 'before' | 'after' | 'into';

function computeDropPosition(e: DragOverEvent): DropPosition {
  if (!e.over) return 'after';
  // Use pointer position within the over element's rect
  const rect = e.over.rect;
  if (!rect) return 'after';
  const relY = (e.activatorEvent as PointerEvent).clientY - rect.top;
  const pct = relY / rect.height;
  if (pct < 0.25) return 'before';
  if (pct > 0.75) return 'after';
  return 'into';
}

export function TreePanel() {
  const nodes = useTaxonomyStore(s => s.nodes);
  const rootIds = useTaxonomyStore(s => s.rootIds);
  const focusedNodeId = useTaxonomyStore(s => s.focusedNodeId);
  const typeVocabulary = useTaxonomyStore(s => s.typeVocabulary);
  const reparentNode = useTaxonomyStore(s => s.reparentNode);
  const getDescendantIds = useTaxonomyStore(s => s.getDescendantIds);
  const clearSelection = useTaxonomyStore(s => s.clearSelection);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const displayIds = focusedNodeId
    ? (nodes[focusedNodeId]?.childIds ?? [])
    : rootIds;

  const focusedNode = focusedNodeId ? nodes[focusedNodeId] : null;
  const focusedTypeDef = focusedNode ? typeVocabulary.find(t => t.id === focusedNode.type) : undefined;

  // Siblings of focused node (for orientation strip)
  let siblingIds: string[] = [];
  if (focusedNode) {
    siblingIds = focusedNode.parentId === null
      ? rootIds.filter(id => id !== focusedNodeId)
      : (nodes[focusedNode.parentId]?.childIds ?? []).filter(id => id !== focusedNodeId);
  }

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    if (!e.over) { setDropOverId(null); return; }
    setDropOverId(e.over.id as string);
    setDropPosition(computeDropPosition(e));
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setDropOverId(null);
    setDropPosition(null);

    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const overId = over.id as string;
    const overNode = nodes[overId];
    if (!overNode) return;

    // Prevent dropping onto descendants
    const descendants = getDescendantIds(draggedId);
    if (descendants.includes(overId)) return;

    if (dropPosition === 'into') {
      reparentNode(draggedId, overId, undefined);
    } else {
      const newParentId = overNode.parentId;
      const siblings = newParentId === null
        ? rootIds
        : (nodes[newParentId]?.childIds ?? []);
      const overIdx = siblings.indexOf(overId);
      const insertIndex = dropPosition === 'before' ? overIdx : overIdx + 1;
      reparentNode(draggedId, newParentId, insertIndex);
    }
  }, [nodes, rootIds, dropPosition, reparentNode, getDescendantIds]);

  const activeNode = activeId ? nodes[activeId] : null;
  const activeTypeDef = activeNode ? typeVocabulary.find(t => t.id === activeNode.type) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={styles.panel}
        role="tree"
        aria-label="Taxonomy tree"
        onClick={() => clearSelection()}
      >
        {focusedNode && (
          <>
            {siblingIds.length > 0 && (
              <div className={styles.siblingsStrip} aria-label="Siblings (context)">
                {siblingIds.map(id => (
                  <span key={id} className={styles.siblingPill}>
                    {nodes[id]?.label}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.focusHeading}>
              <TypeBadge typeDef={focusedTypeDef} />
              {' '}
              {focusedNode.label}
            </div>
          </>
        )}

        {displayIds.length === 0 ? (
          <div className={styles.empty}>
            {focusedNode ? 'No children. Add one below.' : 'No nodes yet. Add one above.'}
          </div>
        ) : (
          <NodeList
            nodeIds={displayIds}
            dropOverId={dropOverId}
            dropPosition={dropPosition}
          />
        )}
      </div>

      <DragOverlay>
        {activeNode && (
          <div style={{
            background: 'var(--white)',
            border: '2px solid var(--gray-900)',
            borderRadius: 'var(--radius-base)',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
          }}>
            <TypeBadge typeDef={activeTypeDef} />
            {activeNode.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
