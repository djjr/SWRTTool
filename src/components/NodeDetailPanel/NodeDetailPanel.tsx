import styles from './NodeDetailPanel.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';
import { AIAssistPanel } from './AIAssistPanel';

export function NodeDetailPanel() {
  const editingNodeId = useTaxonomyStore(s => s.editingNodeId);
  const activeDetailTab = useTaxonomyStore(s => s.activeDetailTab);
  const setEditingNode = useTaxonomyStore(s => s.setEditingNode);
  const setActiveDetailTab = useTaxonomyStore(s => s.setActiveDetailTab);
  const nodes = useTaxonomyStore(s => s.nodes);
  const typeVocabulary = useTaxonomyStore(s => s.typeVocabulary);
  const updateNode = useTaxonomyStore(s => s.updateNode);

  if (!editingNodeId) return null;

  const node = nodes[editingNodeId];
  if (!node) return null;

  const examples = node.examples ?? [];
  const links = node.links ?? [];

  function update<K extends keyof typeof node>(key: K, value: typeof node[K]) {
    updateNode(editingNodeId!, { [key]: value } as Parameters<typeof updateNode>[1]);
  }

  function updateExample(idx: number, value: string) {
    const next = [...examples];
    next[idx] = value;
    update('examples', next);
  }

  function removeExample(idx: number) {
    update('examples', examples.filter((_, i) => i !== idx));
  }

  function updateLink(idx: number, field: 'label' | 'url', value: string) {
    const next = links.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    update('links', next);
  }

  function removeLink(idx: number) {
    update('links', links.filter((_, i) => i !== idx));
  }

  return (
    <aside className={styles.panel} aria-label="Node detail panel">
      <div className={styles.header} style={{ position: 'relative' }}>
        <button
          className={styles.closeBtn}
          onClick={() => setEditingNode(null)}
          aria-label="Close detail panel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <input
          className={styles.labelInput}
          value={node.label}
          onChange={e => update('label', e.target.value)}
          placeholder="Node label"
          aria-label="Node label"
        />

        <div className={styles.meta}>
          <span className={styles.typeLabel}>Type</span>
          <select
            className={styles.typeSelect}
            value={node.type}
            onChange={e => update('type', e.target.value)}
            aria-label="Node type"
          >
            {typeVocabulary.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          className={`${styles.tab} ${activeDetailTab === 'content' ? styles.tabActive : ''}`}
          role="tab"
          aria-selected={activeDetailTab === 'content'}
          onClick={() => setActiveDetailTab('content')}
        >
          Content
        </button>
        <button
          className={`${styles.tab} ${activeDetailTab === 'ai' ? styles.tabActive : ''}`}
          role="tab"
          aria-selected={activeDetailTab === 'ai'}
          onClick={() => setActiveDetailTab('ai')}
        >
          AI Assist
        </button>
      </div>

      <div className={styles.body}>
        {activeDetailTab === 'content' ? (
          <>
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Description</div>
              <textarea
                className={styles.textarea}
                value={node.description ?? ''}
                onChange={e => update('description', e.target.value)}
                placeholder="Describe this node…"
                aria-label="Description"
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>Examples</div>
              {examples.map((ex, i) => (
                <div key={i} className={styles.listItem}>
                  <input
                    className={styles.listInput}
                    value={ex}
                    onChange={e => updateExample(i, e.target.value)}
                    placeholder={`Example ${i + 1}`}
                    aria-label={`Example ${i + 1}`}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeExample(i)}
                    aria-label="Remove example"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                className={styles.addBtn}
                onClick={() => update('examples', [...examples, ''])}
              >
                + Add example
              </button>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>Links</div>
              {links.map((link, i) => (
                <div key={i} className={styles.listItem} style={{ flexWrap: 'wrap', gap: '6px' }}>
                  <input
                    className={styles.listInput}
                    value={link.label}
                    onChange={e => updateLink(i, 'label', e.target.value)}
                    placeholder="Label"
                    style={{ flex: '0 0 calc(40% - 3px)' }}
                    aria-label={`Link ${i + 1} label`}
                  />
                  <input
                    className={styles.listInput}
                    value={link.url}
                    onChange={e => updateLink(i, 'url', e.target.value)}
                    placeholder="URL"
                    type="url"
                    style={{ flex: '1' }}
                    aria-label={`Link ${i + 1} URL`}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeLink(i)}
                    aria-label="Remove link"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                className={styles.addBtn}
                onClick={() => update('links', [...links, { label: '', url: '' }])}
              >
                + Add link
              </button>
            </div>
          </>
        ) : (
          <AIAssistPanel node={node} />
        )}
      </div>
    </aside>
  );
}
