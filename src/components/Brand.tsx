import AnimatedLink from './AnimatedLink';

export default function Brand({ compact = false }: { compact?: boolean }) {
  return <AnimatedLink className={`brand ${compact ? 'brand-compact' : ''}`} to="/" aria-label="VELLIUM — на главную">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 42 42" fill="none"><path d="M5 6.5h8L21 29l8-22.5h8L24.7 36h-7.4L5 6.5Z" fill="currentColor"/><path d="M16 6.5 21 20l5-13.5" stroke="#11100f" strokeWidth="2"/></svg></span>
    <span className="brand-word">VELLIUM<span className="brand-dot">.</span></span>
  </AnimatedLink>;
}
