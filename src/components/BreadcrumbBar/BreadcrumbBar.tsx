import styles from './BreadcrumbBar.module.css';
import { useTaxonomyStore } from '../../store/taxonomyStore';

export function BreadcrumbBar() {
  const focusedNodeId = useTaxonomyStore(s => s.focusedNodeId);
  const getAncestorPath = useTaxonomyStore(s => s.getAncestorPath);
  const setFocus = useTaxonomyStore(s => s.setFocus);

  if (!focusedNodeId) return null;

  const path = getAncestorPath(focusedNodeId);

  return (
    <nav className={styles.bar} aria-label="Breadcrumb navigation">
      <div className={styles.crumb}>
        <button
          className={`${styles.crumbBtn} ${styles.crumbRoot}`}
          onClick={() => setFocus(null)}
        >
          All
        </button>
      </div>
      {path.map((node, i) => {
        const isLast = i === path.length - 1;
        return (
          <div key={node.id} className={styles.crumb}>
            <span className={styles.separator} aria-hidden>/</span>
            {isLast ? (
              <span className={styles.crumbCurrent}>{node.label}</span>
            ) : (
              <button
                className={styles.crumbBtn}
                onClick={() => setFocus(node.id)}
              >
                {node.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
