import { type RefObject, useEffect, useRef } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseModalFocusTrapOptions {
  isOpen: boolean;
  modalRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

export function useModalFocusTrap({ isOpen, modalRef, initialFocusRef, onEscape }: UseModalFocusTrapOptions) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitialElement = window.requestAnimationFrame(() => {
      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      const initialFocusTarget = initialFocusRef?.current ?? getFocusableElements(modal)[0] ?? modal;
      initialFocusTarget.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      const focusableElements = getFocusableElements(modal);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!modal.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusInitialElement);
      document.removeEventListener('keydown', handleKeyDown, true);

      const previousActiveElement = previousActiveElementRef.current;
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, [initialFocusRef, isOpen, modalRef]);
}
