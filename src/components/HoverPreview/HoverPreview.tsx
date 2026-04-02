import { useEffect, useState } from 'react';
import styles from './HoverPreview.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';

interface Props {
  nodeId: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

export function HoverPreview({ nodeId, anchorRef }: Props) {
  const nodes = useTaxonomyStore(s => s.nodes);
  const getDescendantIds = useTaxonomyStore(s => s.getDescendantIds);

  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.right + 8 });
  }, [anchorRef]);

  const node = nodes[nodeId];
  if (!node) return null;

  const children = node.childIds.map(id => nodes[id]).filter(Boolean);
  const descendantCount = getDescendantIds(nodeId).length;
  const preview = children.slice(0, 5);
  const overflow = children.length - preview.length;

  return (
    <div
      className={styles.preview}
      style={{ top: pos.top, left: pos.left }}
      role="tooltip"
      aria-label={`Preview of ${node.label}`}
    >
      <div className={styles.label}>{node.label}</div>
      {node.description && (
        <div className={styles.description}>{node.description}</div>
      )}
      <div className={styles.stats}>
        <span><strong>{node.childIds.length}</strong> children</span>
        <span><strong>{descendantCount}</strong> descendants</span>
      </div>
      <ul className={styles.childList}>
        {preview.map(c => c && (
          <li key={c.id} className={styles.childItem}>— {c.label}</li>
        ))}
      </ul>
      {overflow > 0 && (
        <div className={styles.more}>and {overflow} more…</div>
      )}
    </div>
  );
}
