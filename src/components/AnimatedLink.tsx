import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export default function AnimatedLink({ to, onClick, ...props }: Props) {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const next = () => flushSync(() => navigate(to));
    const transition = (document as Document & { startViewTransition?: (callback: () => void) => void }).startViewTransition;
    if (!transition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      next();
      return;
    }
    transition.call(document, next);
  }

  return <a {...props} href={to} onClick={handleClick}/>;
}
