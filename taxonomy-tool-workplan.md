# Stepwise Refinement Tool — Workplan
## For handoff to Claude Code

---

## Vision

A hierarchical taxonomy editor where users can think at any level of abstraction and move freely between them. The core affordance is **bidirectional refinement**: drilling a node into children (decomposing downward) and grouping siblings under a new abstraction (composing upward). The initial use case is collaborative learning taxonomy building.

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | [React](https://react.dev) + [Vite](https://vitejs.dev) | Fast iteration, good hot module replacement |
| Language | [TypeScript](https://www.typescriptlang.org) | The data model has enough shape that types pay off immediately |
| State | [Zustand](https://zustand.docs.pmnd.rs) | Lightweight, no boilerplate, good devtools |
| DnD | [dnd-kit](https://dndkit.com) | Modern, accessible, well-maintained |
| Persistence | localStorage (prototype) | Simple; swap for a backend later |
| Styling | [CSS Modules](https://github.com/css-modules/css-modules) + CSS custom properties | No extra dependency, full control |
| AI (future) | [Anthropic SDK](https://github.com/anthropic-ai/anthropic-sdk-typescript) (`@anthropic-ai/sdk`) | Stub the interface now, activate later |

No component library. Custom components only — this UI has a specific interaction model that no library will fit cleanly.

---

## Data Model

The single most important architectural decision: **flat map, not nested tree.**

```typescript
// The node itself — no children embedded, just IDs
interface TaxonomyNode {
  id: string;                          // uuid
  label: string;
  description?: string;
  examples?: string[];
  links?: Array<{ label: string; url: string }>;
  type: string;                        // references TypeDefinition.id
  parentId: string | null;             // null = root-level
  childIds: string[];                  // ordered
  createdAt: number;
  updatedAt: number;
}

// The full store shape
interface TaxonomyStore {
  // DATA
  nodes: Record<string, TaxonomyNode>; // the whole tree, indexed by ID
  rootIds: string[];                   // top-level nodes (no parent)
  typeVocabulary: TypeDefinition[];    // customizable

  // VIEW STATE
  focusedNodeId: string | null;        // null = whole tree visible
  expandedIds: Set<string>;
  selectedIds: Set<string>;            // for multi-select → wrap
  editingNodeId: string | null;        // node open in detail panel
  activeDetailTab: 'content' | 'ai';
}

interface TypeDefinition {
  id: string;
  label: string;        // e.g. "Topic", "Skill", "Example"
  color: string;        // one of the design system ramps
  isDefault: boolean;   // can the user delete it?
}
```

**Why flat map?** Reparenting a node in a nested tree requires finding and mutating nodes in two places across potentially deep nesting. With a flat map:
- Reparent = update `node.parentId`, remove from old parent's `childIds`, insert into new parent's `childIds`. All O(1) lookups.
- Get breadcrumb path = follow `parentId` pointers until null.
- Get all descendants = BFS from a node ID, reading `childIds`. No recursive traversal needed.

**Default type vocabulary:**
```typescript
const DEFAULT_TYPES: TypeDefinition[] = [
  { id: 'domain',  label: 'Domain',  color: 'purple', isDefault: true },
  { id: 'topic',   label: 'Topic',   color: 'teal',   isDefault: true },
  { id: 'concept', label: 'Concept', color: 'blue',   isDefault: true },
  { id: 'skill',   label: 'Skill',   color: 'amber',  isDefault: true },
  { id: 'example', label: 'Example', color: 'coral',  isDefault: true },
];
```

---

## Core Store Operations

Define these as pure functions first (easier to test), then wire into Zustand:

```typescript
// Decompose downward
addChild(parentId: string, partial: Partial<TaxonomyNode>): string

// Add at same level
addSibling(siblingId: string, partial: Partial<TaxonomyNode>): string

// Compose upward: wrap selected siblings under a new parent
wrapNodes(nodeIds: string[], newLabel: string, newType: string): string

// Restructure
reparentNode(nodeId: string, newParentId: string | null, insertIndex?: number): void
deleteNode(nodeId: string, deleteDescendants: boolean): void

// Navigation
setFocus(nodeId: string | null): void
getAncestorPath(nodeId: string): TaxonomyNode[]  // root → node, for breadcrumbs
getDescendantIds(nodeId: string): string[]         // all descendants, BFS order

// Content
updateNode(nodeId: string, patch: Partial<TaxonomyNode>): void
```

The `wrapNodes` operation deserves attention: given a set of selected node IDs (which must all share the same parent), it:
1. Creates a new node with the given label/type
2. Inserts the new node where the first selected node was
3. Reparents all selected nodes as children of the new node
4. Validates that all selected nodes share the same parent (silently bail otherwise)

---

## Component Architecture

```
App
├── AppHeader
│   └── VocabularyButton → VocabularyModal
│
├── BreadcrumbBar              ← only visible when focusedNodeId !== null
│   └── BreadcrumbCrumb[]     ← click any crumb to navigate up
│
├── ToolBar
│   ├── ViewModeToggle         ← Outliner | Focus
│   ├── WrapButton             ← enabled when selectedIds.size >= 2
│   └── AddRootButton
│
├── TreePanel
│   ├── NodeRow[]              ← recursive, one per visible node
│   │   ├── ExpandToggle
│   │   ├── SelectCheckbox     ← visible on hover or when any node is selected
│   │   ├── TypeBadge
│   │   ├── NodeLabel          ← inline editable (double-click or Enter)
│   │   └── NodeActions        ← add child, add sibling, focus, open detail
│   └── DragOverlay            ← dnd-kit ghost
│
├── NodeDetailPanel            ← slides in from right when editingNodeId is set
│   ├── LabelField
│   ├── TypeSelector
│   ├── DescriptionField       ← textarea, markdown-friendly
│   ├── ExamplesEditor         ← list of strings, add/remove
│   ├── LinksEditor            ← list of {label, url} pairs
│   └── AIAssistPanel          ← stub; see AI section below
│
├── HoverPreview               ← popover on node hover, shows child summary
│
└── VocabularyModal
    ├── TypeRow[] (label, color picker, delete)
    └── AddTypeForm
```

---

## Phases

### Phase 1 — Data layer
*Deliverable: the store works correctly with no UI beyond console tests.*

- Set up Vite + React + TypeScript project
- Define all TypeScript interfaces
- Implement all pure store operations (add, delete, reparent, wrap, getAncestorPath, getDescendantIds)
- Wire into Zustand store
- Implement localStorage persistence (serialize/deserialize the store; handle missing/corrupt data gracefully)
- Seed with a small example taxonomy for development (e.g. "Data Literacy" with 2-3 levels filled in)

### Phase 2 — Basic outliner
*Deliverable: you can see and expand the tree.*

- `NodeRow` component renders label, type badge, expand/collapse toggle
- Recursive rendering: `NodeList` takes a list of IDs and renders `NodeRow` for each; each `NodeRow` renders a child `NodeList`
- Indentation via CSS `padding-left` based on depth prop
- Type badge styled by `TypeDefinition.color`
- Expand/collapse updates `expandedIds` in store
- Visual depth cues: very subtle opacity or left-border color shift by depth level

### Phase 3 — Editing
*Deliverable: you can add, edit, and delete nodes.*

- Double-click a label to edit inline (controlled input, confirm on Enter/blur, cancel on Escape)
- `NodeActions` bar appears on row hover: add child, add sibling, delete, open detail
- `NodeDetailPanel` slides in from right: full editing of description, examples, links, type
- Delete confirmation for nodes with children (offer "delete subtree" vs "promote children")
- `AddRootButton` in toolbar adds a node at the root level

### Phase 4 — Focus mode and navigation
*Deliverable: you can zoom into and out of subtrees.*

- "Focus" action on a node sets `focusedNodeId`; the outliner re-renders showing only that subtree
- `BreadcrumbBar` appears showing path from root to focused node; clicking any crumb resets `focusedNodeId`
- In focus mode, the focused node's label appears as a heading above the outliner
- A "siblings" context strip (collapsible) shows the focused node's siblings as inactive pills — visible for orientation but not editable in this mode

### Phase 5 — Multi-select and wrap
*Deliverable: you can group existing nodes into a new abstraction.*

- Clicking a row's `SelectCheckbox` (or Shift+click the label) adds to `selectedIds`
- `WrapButton` in toolbar activates when `selectedIds.size >= 2` and all selected nodes share the same parent
- Click opens a small modal: enter the new parent's label and choose its type, then confirm
- After wrap, the new parent is expanded and selected nodes appear as its children
- Clear selection on Escape or by clicking empty space

### Phase 6 — Drag to reparent
*Deliverable: you can restructure the tree by dragging.*

- Integrate dnd-kit's [`DndContext`](https://docs.dndkit.com/api-documentation/context-provider), [`SortableContext`](https://docs.dndkit.com/presets/sortable/sortable-context), and [`useSortable`](https://docs.dndkit.com/presets/sortable/usesortable)
- Dragging a `NodeRow` shows a drag ghost
- Valid drop targets: "before node", "after node", "into node as last child" — distinguished by where the cursor is relative to the target row's vertical thirds
- Visual indicator: horizontal line (before/after) or highlighted indent zone (into)
- On drop, call `reparentNode` with the computed new parent and insert index
- Prevent dropping a node into its own descendants (validate against `getDescendantIds`)

### Phase 7 — Hover preview
*Deliverable: you can glance at a subtree without navigating into it.*

- Hovering a collapsed node for ~500ms opens a `HoverPreview` popover
- Popover shows: node label, type, description excerpt (if any), count of children and total descendants, first 3–5 child labels as a simple list
- Popover is non-interactive (not a click target itself) — it disappears when cursor leaves the node row
- Hovering an expanded node does not trigger the preview

### Phase 8 — Vocabulary management
*Deliverable: users can customize the type system.*

- `VocabularyModal` lists current types with label, color swatch, and delete button
- Default types are not deletable
- "Add type" form: label input + color picker (choose from the design system ramps)
- Changes persist to the store and to localStorage
- Nodes using a deleted type fall back to a "custom" type indicator

### Phase 9 — AI assistance architecture (stub)
*Deliverable: the interface is designed and wired; responses are mocked.*

The goal here is to get the **interface right** — the actual API call can be a mock for the prototype. You want to design the prompt structures and response contracts now so they're easy to activate later.

**Three AI actions**, all triggered from `AIAssistPanel` in the node detail panel:

```typescript
// Suggest children: decompose this node downward
type SuggestChildrenRequest = {
  action: 'suggest_children';
  node: Pick<TaxonomyNode, 'label' | 'description' | 'type'>;
  existingChildren: string[];    // labels of current children, to avoid duplication
  vocabularyContext: string[];   // current type labels, so Claude knows the schema
};

// Suggest a parent grouping for selected siblings
type SuggestGroupingRequest = {
  action: 'suggest_grouping';
  siblings: Pick<TaxonomyNode, 'label' | 'type'>[];
  parentContext: Pick<TaxonomyNode, 'label' | 'type'> | null;
};

// Suggest missing siblings at the same level
type SuggestSiblingsRequest = {
  action: 'suggest_siblings';
  node: Pick<TaxonomyNode, 'label' | 'description' | 'type'>;
  existingSiblings: string[];
  parentContext: Pick<TaxonomyNode, 'label' | 'type'> | null;
};

// Unified response shape
interface AIAssistResponse {
  suggestions: Array<{
    label: string;
    type: string;
    rationale: string;   // shown as tooltip/helper text in the UI
  }>;
}
```

The UI for each action:
1. User clicks "Suggest children" (or "Suggest grouping", "Suggest siblings")
2. A loading state shows while the request is in flight
3. Suggestions appear as checkboxes — user selects which ones to accept
4. "Add selected" button runs the appropriate store operation for each accepted suggestion

For the prototype, mock the Anthropic call with a setTimeout + hardcoded response. Stub structure:

```typescript
// src/services/ai.ts
export async function getAISuggestions(
  req: SuggestChildrenRequest | SuggestGroupingRequest | SuggestSiblingsRequest
): Promise<AIAssistResponse> {
  // TODO: replace with real Anthropic SDK call
  await new Promise(r => setTimeout(r, 800));
  return MOCK_RESPONSES[req.action];
}
```

When you're ready to activate: the prompt templates go in `src/services/prompts.ts`, and the Anthropic client in `src/services/anthropic.ts`. The `ai.ts` file just swaps its implementation.

---

## Design Notes

**The vocabulary colors are the primary visual language.** A well-colored tree should let users orient at a glance — "lots of amber means this section is skill-heavy, lots of teal means topic-heavy." Make the type badges prominent (not just a tiny dot).

**Depth should feel like depth.** Indentation alone is weak. Consider: a very subtle left border color that shifts with depth, or a slight background tint on alternating depths. Don't overdo it — restraint is better — but make the hierarchy feel embodied.

**Selection state must be obvious.** When nodes are selected for wrapping, the selection state needs to be unmistakable — a clear highlight, not a subtle border change. Users will be selecting nodes while thinking about the taxonomy, not paying close attention to the UI.

**The detail panel should not feel like a form.** The panel is where users do reflective work — adding descriptions, examples, links. Consider a more editorial layout (large label at top, clear sections with soft dividers) rather than a label-above-input form grid.

**Keyboard-first feels right for this tool.** Power users will want:
- `Enter` on a selected node = add sibling below
- `Tab` on a node = indent (make it a child of the previous sibling)
- `Shift+Tab` = outdent (lift it to the parent's level)
- `Space` = expand/collapse
- `F` or `→` = focus into selected node
- `Escape` = unfocus / go up a level

Wire these in Phase 3 or 4; they're not essential for the prototype but will make demos feel polished.

---

## What This Prototype Is Trying to Answer

Before pivoting to a real product, the prototype should help you answer:

1. **Is the outliner + focus hybrid the right model?** Or do users want something more spatial (a canvas)?
2. **Is "wrap selection" discoverable?** Or does grouping upward need a different affordance?
3. **How many levels of depth do real taxonomies need?** This affects whether the breadcrumb model holds up.
4. **Does type vocabulary actually help, or does it add friction?** Watch whether test users use it or ignore it.
5. **Where does AI assistance feel natural vs intrusive?** The stub lets you show the interaction without committing to prompts.

---

## Deployment and Persistence Strategy

Data persistence (the taxonomy) and AI API calls are separate concerns with different constraints. It's worth being explicit about each.

### Data persistence — localStorage throughout

localStorage is browser-side, so the hosting topology doesn't affect it at all. It works identically in local dev, on GitHub Pages, and alongside a Railway backend. The limitation is that data is per-browser and per-device, which is fine for a single-user prototype.

`src/services/persistence.ts` handles serialize/deserialize. Design it as a thin adapter from day one so the storage backend can be swapped later:

```typescript
// The interface the rest of the app talks to
export interface PersistenceAdapter {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
}

// The implementation used in the prototype
export const localStorageAdapter: PersistenceAdapter = {
  load: async () => JSON.parse(localStorage.getItem('taxonomy') ?? 'null'),
  save: async (state) => localStorage.setItem('taxonomy', JSON.stringify(state)),
};
```

When you move to a real product, you swap in a different adapter that hits a backend API. Nothing else changes.

### AI API calls — the key can't live in frontend code

An Anthropic API key embedded in a GitHub Pages bundle is publicly readable. The Railway backend exists solely to hold the key server-side. It's a thin proxy — no database, no auth for the prototype:

```typescript
// server/index.ts (Railway — minimal Express proxy)
app.post('/api/suggest', async (req, res) => {
  const response = await anthropic.messages.create(req.body);
  res.json(response);
});
```

The frontend's `src/services/ai.ts` reads its target URL from an environment variable:

```typescript
const AI_BASE_URL = import.meta.env.VITE_AI_API_URL ?? null;

export async function getAISuggestions(req: AIRequest): Promise<AIAssistResponse> {
  if (!AI_BASE_URL) return MOCK_RESPONSES[req.action]; // stub path
  const res = await fetch(`${AI_BASE_URL}/api/suggest`, { method: 'POST', body: JSON.stringify(req) });
  return res.json();
}
```

This means the mock and the real path are controlled by a single env var — no code changes needed when switching.

### Upgrade path

| Stage | Data | AI | Deploy | Notes |
|---|---|---|---|---|
| Local testing | localStorage | mocked | `vite dev` | No env vars needed |
| Frontend demo | localStorage | mocked | GitHub Pages | `VITE_AI_API_URL` unset |
| Full demo | localStorage | Railway proxy | GitHub Pages + Railway | Set `VITE_AI_API_URL` in GitHub Actions |
| Real product | Backend DB | Railway (or same) | TBD | Swap persistence adapter |

### GitHub Pages routing gotcha

GitHub Pages serves static files. If a user navigates directly to a deep URL like `yourname.github.io/taxonomy-tool/node/abc123`, GitHub Pages looks for a file at that path, finds nothing, and returns a 404.

The two standard fixes:

**Option A — Hash routing** (simplest for a prototype): Use `/#/node/abc123` style URLs. Configure React Router with `createHashRouter` instead of `createBrowserRouter`. No server configuration needed. Downside: URLs are less clean.

**Option B — 404.html redirect trick**: Copy `index.html` to `404.html`. GitHub Pages serves `404.html` on any unmatched path, which boots the React app, which then reads the URL and routes correctly. Add this to your Vite build script. Slightly more setup but gives clean URLs.

For a prototype with no deep-linking requirements, **Option A is the right call**. Set `createHashRouter` from the start in `src/App.tsx` and don't think about it again.

Also set the `base` option in `vite.config.ts` to your repo name:

```typescript
export default defineConfig({
  base: '/your-repo-name/',  // must match GitHub Pages deployment path
  // ...
});
```

### File additions for deployment

```
server/               ← add when Railway backend is needed
├── index.ts          # Express proxy
├── package.json
└── tsconfig.json

.github/
└── workflows/
    └── deploy.yml    # GitHub Actions: build → push to gh-pages branch
```

The `deploy.yml` workflow is a standard Vite + GitHub Pages pattern — Claude Code can generate it in one shot when you're ready.

---

## File Structure

```
src/
├── types/
│   └── taxonomy.ts          # All TypeScript interfaces
├── store/
│   ├── taxonomyStore.ts     # Zustand store
│   ├── operations.ts        # Pure functions (add, delete, reparent, wrap, etc.)
│   └── seed.ts              # Dev-time example taxonomy
├── services/
│   ├── ai.ts                # getAISuggestions (stub)
│   ├── prompts.ts           # Prompt templates (for future activation)
│   └── persistence.ts       # localStorage serialize/deserialize
├── components/
│   ├── AppHeader/
│   ├── BreadcrumbBar/
│   ├── ToolBar/
│   ├── TreePanel/
│   │   ├── NodeRow/
│   │   ├── NodeList/
│   │   ├── TypeBadge/
│   │   └── NodeActions/
│   ├── NodeDetailPanel/
│   │   ├── ExamplesEditor/
│   │   ├── LinksEditor/
│   │   └── AIAssistPanel/
│   ├── HoverPreview/
│   └── VocabularyModal/
├── hooks/
│   ├── useNodePath.ts       # getAncestorPath wrapped as a hook
│   ├── useDescendants.ts
│   └── useKeyboardNav.ts    # Phase 3+
├── styles/
│   ├── tokens.css           # CSS custom properties
│   └── global.css
└── App.tsx

server/                      # add in Phase 9 when Railway proxy is needed
├── index.ts
└── package.json
```
