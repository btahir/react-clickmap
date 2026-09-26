const DEFAULT_MASK_SELECTORS = ["input", "textarea", "[contenteditable]"];

export interface SelectorOptions {
  maskSelectors?: string[];
}

export function isMaskedElement(element: Element, selectors: string[] = []): boolean {
  const active = [...DEFAULT_MASK_SELECTORS, ...selectors];
  return active.some((selector) => element.closest(selector) !== null);
}

export function matchesAnySelector(element: Element, selectors: string[] = []): boolean {
  if (selectors.length === 0) {
    return false;
  }

  return selectors.some((selector) => element.closest(selector) !== null);
}

export function getElementSelector(
  target: EventTarget | null,
  options: SelectorOptions = {},
): string | undefined {
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
    const stableId = current.getAttribute("data-clickmap-id");
    if (stableId && /^[a-zA-Z0-9_-]{1,100}$/.test(stableId)) {
      segments.unshift(`[data-clickmap-id="${stableId}"]`);
      break;
    }
    const tagName = current.tagName.toLowerCase();
    const classNames = "";

    const parent = current.parentElement;
    const siblingIndex = parent
      ? Array.from(parent.children)
          .filter((child) => child.tagName === current?.tagName)
          .indexOf(current) + 1
      : 0;

    const suffix = siblingIndex > 0 ? `:nth-of-type(${siblingIndex})` : "";
    const classPart = classNames ? `.${classNames}` : "";

    segments.unshift(`${tagName}${classPart}${suffix}`);
    current = parent;
    depth += 1;
  }

  return segments.join(" > ") || undefined;
}
