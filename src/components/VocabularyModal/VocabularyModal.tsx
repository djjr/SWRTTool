import { useState } from 'react';
import styles from './VocabularyModal.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';

const NAMED_SWATCH_COLORS: Record<string, string> = {
  purple: '#6d28d9',
  teal:   '#0d9488',
  blue:   '#2563eb',
  amber:  '#d97706',
  coral:  '#e11d48',
  green:  '#16a34a',
  slate:  '#475569',
};

function resolveSwatchColor(color: string): string {
  return NAMED_SWATCH_COLORS[color] ?? color;
}

interface Props {
  onClose: () => void;
}

export function VocabularyModal({ onClose }: Props) {
  const typeVocabulary = useTaxonomyStore(s => s.typeVocabulary);
  const deleteType = useTaxonomyStore(s => s.deleteType);
  const addType = useTaxonomyStore(s => s.addType);

  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#2563eb');

  function handleAdd() {
    if (!newLabel.trim()) return;
    addType({ label: newLabel.trim(), color: newColor });
    setNewLabel('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal
      aria-label="Manage type vocabulary"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Type Vocabulary</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {typeVocabulary.map(t => (
            <div key={t.id} className={styles.typeRow}>
              <div
                className={styles.colorSwatch}
                style={{ background: resolveSwatchColor(t.color) }}
                aria-label={t.color}
              />
              <div className={styles.typeLabel}>{t.label}</div>
              {t.isDefault && <span className={styles.defaultBadge}>default</span>}
              <button
                className={styles.deleteTypeBtn}
                onClick={() => deleteType(t.id)}
                disabled={t.isDefault}
                aria-label={`Delete ${t.label} type`}
                title={t.isDefault ? 'Default types cannot be deleted' : `Delete ${t.label}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}

          <div className={styles.addForm}>
            <div className={styles.addFormTitle}>Add type</div>
            <div className={styles.addFormRow}>
              <input
                className={styles.addInput}
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="Label (e.g. Objective)"
                aria-label="New type label"
              />
              <label className={styles.colorPickerLabel} title="Pick a color">
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  aria-label="New type color"
                />
                <span
                  className={styles.colorPickerSwatch}
                  style={{ background: newColor }}
                  aria-hidden
                />
              </label>
              <button
                className={styles.addBtn}
                onClick={handleAdd}
                disabled={!newLabel.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
