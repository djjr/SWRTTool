import styles from './NodeActions.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';

interface Props {
  nodeId: string;
  visible: boolean;
  onFocus: () => void;
}

export function NodeActions({ nodeId, visible, onFocus }: Props) {
  const addChild = useTaxonomyStore(s => s.addChild);
  const addSibling = useTaxonomyStore(s => s.addSibling);
  const setEditingNode = useTaxonomyStore(s => s.setEditingNode);
  const setInlineEditingNode = useTaxonomyStore(s => s.setInlineEditingNode);
  const setExpanded = useTaxonomyStore(s => s.setExpanded);
  const deleteNode = useTaxonomyStore(s => s.deleteNode);
  const nodes = useTaxonomyStore(s => s.nodes);

  const hasChildren = (nodes[nodeId]?.childIds.length ?? 0) > 0;

  function handleAddChild(e: React.MouseEvent) {
    e.stopPropagation();
    const newId = addChild(nodeId, { label: '' });
    setExpanded(nodeId, true);
    setInlineEditingNode(newId);
  }

  function handleAddSibling(e: React.MouseEvent) {
    e.stopPropagation();
    const newId = addSibling(nodeId, { label: '' });
    setInlineEditingNode(newId);
  }

  function handleOpenDetail(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingNode(nodeId);
  }

  function handleFocus(e: React.MouseEvent) {
    e.stopPropagation();
    onFocus();
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (hasChildren) {
      // Will be handled by delete confirmation in NodeRow
      const confirmed = window.confirm(
        `"${nodes[nodeId]?.label}" has children. Delete the entire subtree?`
      );
      if (confirmed) deleteNode(nodeId, true);
      else deleteNode(nodeId, false);
    } else {
      deleteNode(nodeId, false);
    }
  }

  return (
    <div className={`${styles.actions} ${visible ? styles.visible : ''}`} role="group" aria-label="Node actions">
      <button
        className={styles.btn}
        onClick={handleAddChild}
        title="Add child (Tab)"
        aria-label="Add child node"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 3h2v4h5V5l3 3-3 3V9H5v4H3V3z" fill="currentColor"/>
        </svg>
      </button>
      <button
        className={styles.btn}
        onClick={handleAddSibling}
        title="Add sibling (Enter)"
        aria-label="Add sibling node"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <button
        className={styles.btn}
        onClick={handleFocus}
        title="Focus into (F / →)"
        aria-label="Focus into this node"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M6 4l5 4-5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        className={styles.btn}
        onClick={handleOpenDetail}
        title="Open detail panel"
        aria-label="Open detail panel"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <button
        className={`${styles.btn} ${styles.deleteBtn}`}
        onClick={handleDelete}
        title="Delete"
        aria-label="Delete node"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
