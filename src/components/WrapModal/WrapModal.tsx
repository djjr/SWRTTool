import { useState, useRef, useEffect } from 'react';
import styles from './WrapModal.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';

interface Props {
  selectedIds: string[];
  onClose: () => void;
}

export function WrapModal({ selectedIds, onClose }: Props) {
  const typeVocabulary = useTaxonomyStore(s => s.typeVocabulary);
  const wrapNodes = useTaxonomyStore(s => s.wrapNodes);
  const clearSelection = useTaxonomyStore(s => s.clearSelection);
  const setExpanded = useTaxonomyStore(s => s.setExpanded);

  const [label, setLabel] = useState('');
  const [type, setType] = useState(typeVocabulary[0]?.id ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleConfirm() {
    if (!label.trim()) return;
    const newId = wrapNodes(selectedIds, label.trim(), type);
    if (newId) {
      setExpanded(newId, true);
      clearSelection();
    }
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleConfirm();
    else if (e.key === 'Escape') onClose();
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-label="Wrap nodes" onKeyDown={handleKeyDown}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>Wrap {selectedIds.length} nodes</div>
        <div className={styles.subtitle}>
          Group the selected nodes under a new parent.
        </div>

        <label className={styles.label} htmlFor="wrap-label">New parent label</label>
        <input
          ref={inputRef}
          id="wrap-label"
          className={styles.input}
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Foundational Methods"
        />

        <label className={styles.label} htmlFor="wrap-type">Type</label>
        <select
          id="wrap-type"
          className={styles.select}
          value={type}
          onChange={e => setType(e.target.value)}
        >
          {typeVocabulary.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button
            className={styles.btnConfirm}
            onClick={handleConfirm}
            disabled={!label.trim()}
          >
            Wrap
          </button>
        </div>
      </div>
    </div>
  );
}
