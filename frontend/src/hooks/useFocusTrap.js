import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside a mount while `active` is true.
 * Focuses the panel on open and restores focus to the previous element on close.
 * Returns a ref to attach to the interactive container.
 */
export function useFocusTrap(active) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const node = ref.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement;
    node.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return ref;
}