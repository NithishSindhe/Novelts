interface CharCounterProps {
  count: number;
  max: number;
  className?: string;
}

/**
 * Small always-on character counter for note editors. Turns amber within the
 * last 10% of the allowed range.
 */
export function CharCounter({ count, max, className = "" }: CharCounterProps) {
  const near = count >= max * 0.9;
  return (
    <p
      className={`text-right font-tech text-xs tabular-nums ${
        near ? "text-amber-600 dark:text-amber-400" : "text-fg-subtle"
      } ${className}`}
    >
      {count.toLocaleString()} / {max.toLocaleString()}
    </p>
  );
}
