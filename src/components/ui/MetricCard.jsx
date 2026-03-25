import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import Icon from './Icon';

const VARIANT_STYLES = {
  gold: 'bg-primary text-on-primary border-primary',
  silver: 'bg-surface-bright text-on-surface border-outline-variant',
  cobalt: 'bg-surface-low text-on-surface border-cobalt',
  default: 'bg-surface-low text-on-surface border-outline-variant',
};

export default function MetricCard({ label, value, sublabel, icon, variant = 'default', className = '' }) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const isGold = variant === 'gold';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'relative overflow-hidden rounded-sm border p-6 flex flex-col gap-3 sheen',
        styles,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className={clsx(
          'font-[Space_Grotesk] text-[10px] font-bold uppercase tracking-widest',
          isGold ? 'text-on-primary/70' : 'text-outline'
        )}>
          {label}
        </p>
        {icon && (
          <div className={clsx(
            'p-2 rounded-sm',
            isGold ? 'bg-on-primary/10' : 'bg-surface-highest'
          )}>
            <Icon name={icon} size={20} className={isGold ? 'text-on-primary' : 'text-primary'} />
          </div>
        )}
      </div>
      <p className={clsx(
        'font-[Inter] font-black text-2xl sm:text-3xl tracking-tighter uppercase truncate',
        isGold ? 'text-on-primary' : 'text-on-surface'
      )}>
        {value}
      </p>
      {sublabel && (
        <p className={clsx(
          'font-[Space_Grotesk] text-[10px] uppercase tracking-wide',
          isGold ? 'text-on-primary/60' : 'text-outline'
        )}>
          {sublabel}
        </p>
      )}
    </motion.div>
  );
}
