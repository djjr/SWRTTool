import { useState } from 'react';
import { useTaxonomyStore } from '../../store/taxonomyStore';
import { getAISuggestions } from '../../services/ai';
import type { TaxonomyNode, AIAssistResponse } from '../../types/taxonomy';
import styles from './NodeDetailPanel.module.css';

interface Props {
  node: TaxonomyNode;
}

type Action = 'suggest_children' | 'suggest_siblings' | 'suggest_grouping';

const ACTION_LABELS: Record<Action, string> = {
  suggest_children: 'Suggest children',
  suggest_siblings: 'Suggest siblings',
  suggest_grouping: 'Suggest grouping',
};

export function AIAssistPanel({ node }: Props) {
  const nodes = useTaxonomyStore(s => s.nodes);
  const typeVocabulary = useTaxonomyStore(s => s.typeVocabulary);
  const addChild = useTaxonomyStore(s => s.addChild);
  const addSibling = useTaxonomyStore(s => s.addSibling);

  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<Action>('suggest_children');
  const [response, setResponse] = useState<AIAssistResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const parent = node.parentId ? nodes[node.parentId] : null;
  const siblings = parent
    ? parent.childIds.map(id => nodes[id]).filter((n): n is TaxonomyNode => !!n && n.id !== node.id)
    : [];
  const vocabContext = typeVocabulary.map(t => t.label);

  async function handleFetch() {
    setLoading(true);
    setResponse(null);
    setSelected(new Set());
    try {
      let req;
      if (action === 'suggest_children') {
        req = {
          action: 'suggest_children' as const,
          node: { label: node.label, description: node.description, type: node.type },
          existingChildren: node.childIds.map(id => nodes[id]?.label ?? '').filter(Boolean),
          vocabularyContext: vocabContext,
        };
      } else if (action === 'suggest_siblings') {
        req = {
          action: 'suggest_siblings' as const,
          node: { label: node.label, description: node.description, type: node.type },
          existingSiblings: siblings.map(s => s.label),
          parentContext: parent ? { label: parent.label, type: parent.type } : null,
        };
      } else {
        req = {
          action: 'suggest_grouping' as const,
          siblings: siblings.map(s => ({ label: s.label, type: s.type })),
          parentContext: parent ? { label: parent.label, type: parent.type } : null,
        };
      }
      const res = await getAISuggestions(req);
      setResponse(res);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(idx: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function handleAddSelected() {
    if (!response) return;
    const items = response.suggestions.filter((_, i) => selected.has(i));
    for (const item of items) {
      if (action === 'suggest_children') {
        addChild(node.id, { label: item.label, type: item.type });
      } else if (action === 'suggest_siblings') {
        addSibling(node.id, { label: item.label, type: item.type });
      }
      // suggest_grouping handled separately (wrap) — complex, skip for stub
    }
    setResponse(null);
    setSelected(new Set());
  }

  return (
    <div>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Action</div>
        {(Object.keys(ACTION_LABELS) as Action[]).map(a => (
          <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="ai-action"
              value={a}
              checked={action === a}
              onChange={() => { setAction(a); setResponse(null); setSelected(new Set()); }}
            />
            <span style={{ fontSize: 'var(--text-sm)' }}>{ACTION_LABELS[a]}</span>
          </label>
        ))}
        <button
          className={styles.addBtn}
          style={{ marginTop: 8 }}
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? 'Thinking…' : ACTION_LABELS[action]}
        </button>
      </div>

      {response && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Suggestions</div>
          {response.suggestions.map((s, i) => (
            <label
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginBottom: 10,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggleItem(i)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                  {s.label}
                  {' '}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                    [{s.type}]
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {s.rationale}
                </div>
              </div>
            </label>
          ))}
          <button
            className={styles.addBtn}
            onClick={handleAddSelected}
            disabled={selected.size === 0}
          >
            + Add {selected.size > 0 ? selected.size : ''} selected
          </button>
        </div>
      )}
    </div>
  );
}
