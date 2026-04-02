import styles from './TypeBadge.module.css';
import type { TypeDefinition } from '../../types/taxonomy';

interface Props {
  typeDef: TypeDefinition | undefined;
}

const COLOR_CLASSES: Record<string, string> = {
  purple:  styles.purple!,
  teal:    styles.teal!,
  blue:    styles.blue!,
  amber:   styles.amber!,
  coral:   styles.coral!,
};

export function TypeBadge({ typeDef }: Props) {
  const colorClass = typeDef
    ? (COLOR_CLASSES[typeDef.color] ?? styles.default!)
    : styles.default!;

  return (
    <span className={`${styles.badge} ${colorClass}`}>
      {typeDef?.label ?? '—'}
    </span>
  );
}
