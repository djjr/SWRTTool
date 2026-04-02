import { useState } from 'react';
import styles from './AppHeader.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';
import { VocabularyModal } from '../VocabularyModal/VocabularyModal';
import { exportStateToFile, importStateFromFile } from '../../services/persistence';

export function AppHeader() {
  const nodes = useTaxonomyStore(s => s.nodes);
  const rootIds = useTaxonomyStore(s => s.rootIds);
  const typeVocabulary = useTaxonomyStore(s => s.typeVocabulary);
  const importState = useTaxonomyStore(s => s.importState);
  const resetToSeed = useTaxonomyStore(s => s.resetToSeed);

  const [showVocab, setShowVocab] = useState(false);

  function handleExport() {
    exportStateToFile({ nodes, rootIds, typeVocabulary });
  }

  async function handleImport() {
    const state = await importStateFromFile();
    if (state) importState(state);
    else alert('Could not read the file. Make sure it is a valid taxonomy JSON export.');
  }

  function handleReset() {
    if (window.confirm('Reset to the example taxonomy? Your current data will be lost.')) {
      resetToSeed();
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          SWR<span className={styles.wordmarkAccent}>T</span>
        </div>
        <div className={styles.subtitle}>Stepwise Refinement Tool</div>

        <div className={styles.spacer} />

        <div className={styles.btnGroup}>
          <button className={styles.btn} onClick={handleImport} title="Load taxonomy from JSON file">
            Import
          </button>
          <button className={styles.btn} onClick={handleExport} title="Save taxonomy as JSON file">
            Export
          </button>
          <button className={styles.btn} onClick={() => setShowVocab(true)} title="Manage type vocabulary">
            Types
          </button>
          <button className={styles.btn} onClick={handleReset} title="Reset to example data">
            Reset
          </button>
        </div>
      </header>

      {showVocab && <VocabularyModal onClose={() => setShowVocab(false)} />}
    </>
  );
}
