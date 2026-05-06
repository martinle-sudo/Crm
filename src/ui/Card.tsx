import { motion } from 'framer-motion';
import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from './cn';

interface BentoCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  trailing?: ReactNode;
  accent?: 'violet' | 'cyan' | 'mint' | 'coral' | 'amber';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  /** Disable the body padding (when chart needs full bleed). */
  flush?: boolean;
}

const accentRing: Record<NonNullable<BentoCardProps['accent']>, string> = {
  violet: 'before:bg-[radial-gradient(ellipse_at_top_right,rgba(167,139,250,0.18),transparent_60%)]',
  cyan: 'before:bg-[radial-gradient(ellipse_at_top_right,rgba(103,232,249,0.18),transparent_60%)]',
  mint: 'before:bg-[radial-gradient(ellipse_at_top_right,rgba(110,231,183,0.18),transparent_60%)]',
  coral: 'before:bg-[radial-gradient(ellipse_at_top_right,rgba(253,164,175,0.18),transparent_60%)]',
  amber: 'before:bg-[radial-gradient(ellipse_at_top_right,rgba(252,211,77,0.16),transparent_60%)]',
};

export function BentoCard({
  title,
  trailing,
  accent,
  size = 'md',
  className,
  children,
  flush,
  ...rest
}: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'bento-card group',
        accent && [
          'before:absolute before:inset-0 before:pointer-events-none before:opacity-80',
          accentRing[accent],
        ],
        size === 'sm' && 'min-h-[140px]',
        size === 'md' && 'min-h-[200px]',
        size === 'lg' && 'min-h-[280px]',
        size === 'xl' && 'min-h-[360px]',
        className,
      )}
      {...(rest as object)}
    >
      {(title || trailing) && (
        <div className="bento-card-header relative z-[1]">
          <div className="bento-title">{title}</div>
          {trailing && <div className="text-zinc-500 text-xs">{trailing}</div>}
        </div>
      )}
      <div className={cn('relative z-[1]', !flush && 'px-5 pb-5 pt-3')}>
        {children}
      </div>
    </motion.div>
  );
}
