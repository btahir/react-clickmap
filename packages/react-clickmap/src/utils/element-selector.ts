const DEFAULT_MASK_SELECTORS = ['input', 'textarea', '[contenteditable]'];

export interface SelectorOptions {
  maskSelectors?: string[];
}

function toCssSafeClassName(className: string): string {
  const value = className.trim();
  if (!value) {
    return '';
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function isMaskedElement(element: Element, selectors: string[] = []): boolean {
  const active = selectors.length > 0 ? selectors : DEFAULT_MASK_SELECTORS;
  return active.some((selector) => element.closest(selector) !== null);
}

export function matchesAnySelector(element: Element, selectors: string[] = []): boolean {
  if (selectors.length === 0) {
    return false;
  }

  return selectors.some((selector) => element.closest(selector) !== null);
}

export function getElementSelector(target: EventTarget | null, options: SelectorOptions = {}): string | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const maskSelectors = options.maskSelectors ?? DEFAULT_MASK_SELECTORS;
  if (isMaskedElement(target, maskSelectors)) {
    return undefined;
  }

  const segments: string[] = [];
  let current: Element | null = target;
  let depth = 0;

  while (current && depth < 5) {
    if (current.id) {
      segments.unshift(`#${current.id}`);
      break;
    }

    const tagName = current.tagName.toLowerCase();
    const rawClassName =
      typeof current.className === 'string'
        ? current.className
        : current.getAttribute('class') ?? '';
    const classNames = rawClassName
      .split(/\s+/)
      .map((value) => toCssSafeClassName(value))
      .filter(Boolean)
      .slice(0, 2)
      .join('.');

    const parent = current.parentElement;
    const siblingIndex = parent
      ? Array.from(parent.children).filter((child) => child.tagName === current?.tagName).indexOf(current) + 1
      : 0;

    const suffix = siblingIndex > 0 ? `:nth-of-type(${siblingIndex})` : '';
    const classPart = classNames ? `.${classNames}` : '';

    segments.unshift(`${tagName}${classPart}${suffix}`);
    current = parent;
    depth += 1;
  }

  return segments.join(' > ') || undefined;
}
