import type { CSSProperties } from 'react';
import styles from './TypeBadge.module.css';
import type { TypeDefinition } from '../../types/taxonomy';

interface Props {
  typeDef: TypeDefinition | undefined;
}

const COLOR_CLASSES: Record<string, string> = {
  purple: styles.purple!,
  teal:   styles.teal!,
  blue:   styles.blue!,
  amber:  styles.amber!,
  coral:  styles.coral!,
};

function hexToInlineStyle(hex: string): CSSProperties {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    background: hex,
    color: luminance > 0.55 ? '#1a1a1a' : '#ffffff',
  };
}

export function TypeBadge({ typeDef }: Props) {
  if (!typeDef) {
    return <span className={`${styles.badge} ${styles.default}`}>—</span>;
  }

  const isHex = typeDef.color.startsWith('#');

  if (isHex) {
    return (
      <span className={styles.badge} style={hexToInlineStyle(typeDef.color)}>
        {typeDef.label}
      </span>
    );
  }

  const colorClass = COLOR_CLASSES[typeDef.color] ?? styles.default!;
  return (
    <span className={`${styles.badge} ${colorClass}`}>
      {typeDef.label}
    </span>
  );
}
