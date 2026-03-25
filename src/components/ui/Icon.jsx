import { clsx } from 'clsx';

export default function Icon({ name, filled = false, size = 24, className = '', style = {} }) {
  return (
    <span
      className={clsx('material-symbols-outlined', className)}
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
        ...style,
      }}
    >
      {name}
    </span>
  );
}
