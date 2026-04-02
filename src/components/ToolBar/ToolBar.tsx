import { useState } from 'react';
import styles from './ToolBar.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';
import { WrapModal } from '../WrapModal/WrapModal';

export function ToolBar() {
  const addRoot = useTaxonomyStore(s => s.addRoot);
  const setInlineEditingNode = useTaxonomyStore(s => s.setInlineEditingNode);
  const selectedIds = useTaxonomyStore(s => s.selectedIds);
  const nodes = useTaxonomyStore(s => s.nodes);
  const clearSelection = useTaxonomyStore(s => s.clearSelection);

  const [showWrapModal, setShowWrapModal] = useState(false);

  function handleAddRoot() {
    const newId = addRoot({ label: '' });
    setInlineEditingNode(newId);
  }

  // Wrap is valid when ≥2 selected and all share same parent
  const selectedArr = [...selectedIds];
  const canWrap = selectedArr.length >= 2 && (() => {
    const parents = new Set(selectedArr.map(id => nodes[id]?.parentId));
    return parents.size === 1;
  })();

  return (
    <>
      <div className={styles.toolbar} role="toolbar" aria-label="Tree tools">
        <div className={styles.group}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleAddRoot}
            title="Add root node"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add root
          </button>
        </div>

        <div className={styles.divider} aria-hidden />

        <div className={styles.group}>
          {selectedIds.size > 0 && (
            <span className={styles.selectionCount}>
              {selectedIds.size} selected
            </span>
          )}
          <button
            className={styles.btn}
            onClick={() => setShowWrapModal(true)}
            disabled={!canWrap}
            title={canWrap ? 'Wrap selected nodes under a new parent' : 'Select 2+ siblings to wrap'}
            aria-disabled={!canWrap}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 5h6M4 7h6M4 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Wrap
          </button>
          {selectedIds.size > 0 && (
            <button
              className={styles.btn}
              onClick={clearSelection}
              title="Clear selection (Escape)"
            >
              Clear
            </button>
          )}
        </div>

        <div className={styles.spacer} />
      </div>

      {showWrapModal && (
        <WrapModal
          selectedIds={selectedArr}
          onClose={() => setShowWrapModal(false)}
        />
      )}
    </>
  );
}
