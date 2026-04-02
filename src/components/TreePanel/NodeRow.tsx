import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './NodeRow.module.css';
import { NodeActions } from './NodeActions';
import { TypeBadge } from '../TypeBadge/TypeBadge';
import { HoverPreview } from '../HoverPreview/HoverPreview';
import { useTaxonomyStore } from '../../store/taxonomyStore';
import type { TaxonomyNode } from '../../types/taxonomy';

interface Props {
  node: TaxonomyNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  dropPosition?: 'before' | 'after' | 'into' | null;
}

const DEPTH_COLORS: string[] = [
  'var(--color-purple-600)',
  'var(--color-teal-600)',
  'var(--color-blue-600)',
  'var(--color-amber-600)',
  'var(--color-coral-600)',
];

// Approximate pixel width of the fixed left-side controls inside the row:
// drag handle (12) + gap (8) + expand toggle (20) + gap (8) + checkbox (16) + gap (8)
// + avg type badge (~56) + gap (8) = ~136px
// This is applied as extra left padding on the inline detail so it aligns with the label.
const ROW_LABEL_OFFSET = 136;

export function NodeRow({ node, depth, isSelected, isExpanded, dropPosition }: Props) {
  const typeVocabulary    = useTaxonomyStore(s => s.typeVocabulary);
  const updateNode        = useTaxonomyStore(s => s.updateNode);
  const setInlineEditingNode  = useTaxonomyStore(s => s.setInlineEditingNode);
  const setEditingNode    = useTaxonomyStore(s => s.setEditingNode);
  const toggleExpanded    = useTaxonomyStore(s => s.toggleExpanded);
  const toggleSelected    = useTaxonomyStore(s => s.toggleSelected);
  const toggleInlineExpanded = useTaxonomyStore(s => s.toggleInlineExpanded);
  const selectedIds       = useTaxonomyStore(s => s.selectedIds);
  const inlineExpandedIds = useTaxonomyStore(s => s.inlineExpandedIds);
  const setFocus          = useTaxonomyStore(s => s.setFocus);
  const addChild          = useTaxonomyStore(s => s.addChild);
  const addSibling        = useTaxonomyStore(s => s.addSibling);
  const setExpanded       = useTaxonomyStore(s => s.setExpanded);
  const inlineEditingNodeId = useTaxonomyStore(s => s.inlineEditingNodeId);

  const [hovered, setHovered] = useState(false);
  const [editValue, setEditValue] = useState(node.label);
  const inputRef    = useRef<HTMLInputElement>(null);
  const rowRef      = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const typeDef      = typeVocabulary.find(t => t.id === node.type);
  const hasChildren  = node.childIds.length > 0;
  const anySelected  = selectedIds.size > 0;
  const accentColor  = DEPTH_COLORS[depth % DEPTH_COLORS.length]!;
  const isInlineEditing  = inlineEditingNodeId === node.id;
  const isInlineExpanded = inlineExpandedIds.has(node.id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  // Outer wrapper gets dnd ref + depth-based padding
  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `calc(var(--space-3) + ${depth * 24}px)`,
  };

  useEffect(() => {
    if (isInlineEditing) {
      setEditValue(node.label);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isInlineEditing, node.label]);

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.label) updateNode(node.id, { label: trimmed });
    else if (!trimmed) setEditValue(node.label);
    setInlineEditingNode(null);
  }

  function handleLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
      const newId = addSibling(node.id, { label: '' });
      setInlineEditingNode(newId);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      if (!e.shiftKey) {
        const newId = addChild(node.id, { label: '' });
        setExpanded(node.id, true);
        setInlineEditingNode(newId);
      }
    } else if (e.key === 'Escape') {
      setEditValue(node.label);
      setInlineEditingNode(null);
    }
  }

  function handleRowKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (isInlineEditing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      setInlineEditingNode(node.id);
    } else if (e.key === ' ') {
      e.preventDefault();
      toggleExpanded(node.id);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (hasChildren && !isExpanded) toggleExpanded(node.id);
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      setFocus(node.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setFocus(null);
    }
  }

  function handleLabelClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isInlineEditing) return;
    toggleInlineExpanded(node.id);
  }

  function handleLabelDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    // Close inline detail if open, start inline label edit
    setInlineEditingNode(node.id);
  }

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    if (!isExpanded && hasChildren) {
      hoverTimerRef.current = setTimeout(() => setShowPreview(true), 500);
    }
  }, [isExpanded, hasChildren]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowPreview(false);
  }, []);

  const rowClasses = [
    styles.row,
    isSelected ? styles.rowSelected : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        (rowRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      style={wrapperStyle}
      className={isDragging ? styles.dragging : undefined}
    >
      {/* ── The interactive row ── */}
      <div
        className={rowClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        {/* Depth accent bar */}
        {depth > 0 && (
          <span className={styles.depthAccent} style={{ background: accentColor }} aria-hidden />
        )}

        {/* Drag handle */}
        <span className={styles.dragHandle} {...attributes} {...listeners} aria-label="Drag to reorder">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden>
            <circle cx="4" cy="4"  r="1.5" fill="currentColor"/>
            <circle cx="8" cy="4"  r="1.5" fill="currentColor"/>
            <circle cx="4" cy="8"  r="1.5" fill="currentColor"/>
            <circle cx="8" cy="8"  r="1.5" fill="currentColor"/>
            <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
          </svg>
        </span>

        {/* Expand toggle */}
        {hasChildren ? (
          <button
            className={styles.expandToggle}
            onClick={e => { e.stopPropagation(); toggleExpanded(node.id); }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            tabIndex={-1}
          >
            <svg
              className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
              width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden
            >
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <span className={styles.expandToggleSpacer} aria-hidden />
        )}

        {/* Selection checkbox */}
        <input
          type="checkbox"
          className={`${styles.checkbox} ${(anySelected || isSelected) ? styles.checkboxVisible : ''}`}
          checked={isSelected}
          onChange={() => toggleSelected(node.id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select ${node.label}`}
          tabIndex={-1}
        />

        {/* Type badge */}
        <TypeBadge typeDef={typeDef} />

        {/* Label group: label + actions inline */}
        <div className={styles.labelGroup}>
          {isInlineEditing ? (
            <input
              ref={inputRef}
              className={styles.labelInput}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleLabelKeyDown}
              onClick={e => e.stopPropagation()}
              aria-label="Edit node label"
            />
          ) : (
            <span
              className={`${styles.label} ${!node.label ? styles.labelEmpty : ''} ${isInlineExpanded ? styles.labelExpanded : ''}`}
              onClick={handleLabelClick}
              onDoubleClick={handleLabelDoubleClick}
              title="Click to preview description · Double-click to rename"
            >
              {node.label || 'Untitled'}
            </span>
          )}

          {/* Actions — immediately follow the label */}
          <NodeActions
            nodeId={node.id}
            visible={hovered && !isInlineEditing}
            onFocus={() => setFocus(node.id)}
          />
        </div>

        {/* Drop indicators */}
        {dropPosition === 'before' && <div className={styles.dropIndicatorBefore} aria-hidden />}
        {dropPosition === 'after'  && <div className={styles.dropIndicatorAfter}  aria-hidden />}
        {dropPosition === 'into'   && <div className={styles.dropIndicatorInto}   aria-hidden />}
      </div>

      {/* ── Inline description accordion ── */}
      {isInlineExpanded && !isInlineEditing && (
        <div className={styles.inlineDetail} style={{ paddingLeft: ROW_LABEL_OFFSET }}>
          <textarea
            className={styles.inlineDescriptionInput}
            value={node.description ?? ''}
            onChange={e => updateNode(node.id, { description: e.target.value })}
            placeholder="No description yet — type to add one."
            rows={3}
            aria-label="Node description"
          />
          <div className={styles.inlineDetailFooter}>
            <button
              className={styles.openDetailBtn}
              onClick={() => setEditingNode(node.id)}
            >
              Open full editor →
            </button>
          </div>
        </div>
      )}

      {/* Hover preview */}
      {showPreview && !isExpanded && hasChildren && (
        <HoverPreview nodeId={node.id} anchorRef={rowRef} />
      )}
    </div>
  );
}
