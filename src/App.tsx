import styles from './App.module.css';
import { AppHeader } from './components/AppHeader/AppHeader';
import { BreadcrumbBar } from './components/BreadcrumbBar/BreadcrumbBar';
import { ToolBar } from './components/ToolBar/ToolBar';
import { TreePanel } from './components/TreePanel/TreePanel';
import { NodeDetailPanel } from './components/NodeDetailPanel/NodeDetailPanel';

export default function App() {
  return (
    <div className={styles.app}>
      <AppHeader />
      <div className={styles.main}>
        <div className={styles.treeArea}>
          <BreadcrumbBar />
          <ToolBar />
          <TreePanel />
        </div>
        <NodeDetailPanel />
      </div>
    </div>
  );
}
