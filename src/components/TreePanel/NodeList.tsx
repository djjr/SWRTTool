import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTaxonomyStore } from '../../store/taxonomyStore';
import { NodeRow } from './NodeRow';

interface Props {
  nodeIds: string[];
  depth?: number;
  dropOverId?: string | null;
  dropPosition?: 'before' | 'after' | 'into' | null;
}

export function NodeList({ nodeIds, depth = 0, dropOverId, dropPosition }: Props) {
  const nodes = useTaxonomyStore(s => s.nodes);
  const expandedIds = useTaxonomyStore(s => s.expandedIds);
  const selectedIds = useTaxonomyStore(s => s.selectedIds);
  const editingNodeId = useTaxonomyStore(s => s.editingNodeId);

  return (
    <SortableContext items={nodeIds} strategy={verticalListSortingStrategy}>
      {nodeIds.map(id => {
        const node = nodes[id];
        if (!node) return null;
        const isExpanded = expandedIds.has(id);
        const isSelected = selectedIds.has(id);
        const isEditing = editingNodeId === id;
        const thisDropPos = dropOverId === id ? dropPosition : null;

        return (
          <div key={id} role="group">
            <NodeRow
              node={node}
              depth={depth}
              isEditing={isEditing}
              isSelected={isSelected}
              isExpanded={isExpanded}
              dropPosition={thisDropPos}
            />
            {isExpanded && node.childIds.length > 0 && (
              <NodeList
                nodeIds={node.childIds}
                depth={depth + 1}
                dropOverId={dropOverId}
                dropPosition={dropPosition}
              />
            )}
          </div>
        );
      })}
    </SortableContext>
  );
}
