export interface WebsiteSearchItem {
  id: string;
  sectionId: string;
  sectionTitle: string;
  groupId?: string;
  groupTitle?: string;
  label: string;
  description?: string;
  valueText?: string;
  aliases?: string[];
  breadcrumbs: string[];
  anchorId: string;
  kind: 'section' | 'group' | 'field' | 'list' | 'row';
}

export interface WebsiteSearchResult extends WebsiteSearchItem {
  score: number;
  snippet: string;
  matchedTerms: string[];
}

const queryAliasMap: Record<string, string[]> = {
  nav: ['navigation', 'navbar', 'menu', 'homepage labels', 'structure'],
  navbar: ['navigation', 'nav', 'menu', 'branding'],
  menu: ['navigation', 'nav', 'navbar', 'homepage labels'],
  hero: ['headline', 'cta', 'button', 'support note'],
  headline: ['hero', 'title', 'copy'],
  cta: ['button', 'call to action', 'hero', 'footer'],
  button: ['cta', 'action', 'label'],
  booking: ['book', 'calendar', 'slot', 'date', 'time', 'consultation'],
  book: ['booking', 'calendar', 'slot', 'consultation'],
  calendar: ['booking', 'date', 'slot', 'time'],
  slot: ['booking', 'calendar', 'time'],
  date: ['booking', 'calendar', 'slot'],
  time: ['booking', 'slot', 'calendar'],
  footer: ['instagram', 'contact', 'copyright', 'cta'],
  instagram: ['art', 'footer', 'social'],
  contact: ['footer', 'branding', 'email', 'phone', 'location'],
  theme: ['color', 'background', 'motion', 'surface', 'contrast'],
  color: ['theme', 'palette', 'background', 'accent'],
  background: ['theme', 'surface', 'color'],
  motion: ['theme', 'scene', 'pointer'],
  profile: ['ethos', 'professional profile', 'role'],
  credentials: ['education', 'study', 'roles', 'experience'],
  practice: ['services', 'therapy', 'support'],
  art: ['visual', 'gallery', 'instagram', 'artwork'],
  client: ['dashboard', 'sign in', 'booking', 'portal'],
};

function uniqueTokens(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeWebsiteSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenizeWebsiteSearchText(value: string) {
  const normalized = normalizeWebsiteSearchText(value);
  return normalized ? normalized.split(' ') : [];
}

export function expandWebsiteSearchTokens(tokens: string[]) {
  const expanded = new Set<string>();

  tokens.forEach((token) => {
    expanded.add(token);
    (queryAliasMap[token] || []).forEach((alias) => {
      tokenizeWebsiteSearchText(alias).forEach((aliasToken) => expanded.add(aliasToken));
    });
  });

  return Array.from(expanded);
}

function isSubsequenceMatch(query: string, target: string) {
  if (!query || !target) return false;
  let queryIndex = 0;
  for (let index = 0; index < target.length; index += 1) {
    if (target[index] === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) {
        return true;
      }
    }
  }
  return false;
}

function buildSnippet(item: WebsiteSearchItem, matchedTerms: string[]) {
  const snippetSource = [item.valueText, item.description].find((value) => value && value.trim()) || item.breadcrumbs.join(' > ');
  const normalizedSource = snippetSource.replace(/\s+/g, ' ').trim();

  if (!normalizedSource) {
    return item.label;
  }

  const lowerSource = normalizedSource.toLowerCase();
  const firstMatchIndex = matchedTerms
    .map((term) => lowerSource.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (firstMatchIndex === undefined) {
    return normalizedSource.slice(0, 120);
  }

  const start = Math.max(0, firstMatchIndex - 32);
  const end = Math.min(normalizedSource.length, firstMatchIndex + 88);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalizedSource.length ? '…' : '';

  return `${prefix}${normalizedSource.slice(start, end)}${suffix}`;
}

function scoreItem(item: WebsiteSearchItem, query: string, tokens: string[], expandedTokens: string[]) {
  const normalizedLabel = normalizeWebsiteSearchText(item.label);
  const normalizedDescription = normalizeWebsiteSearchText(item.description || '');
  const normalizedValue = normalizeWebsiteSearchText(item.valueText || '');
  const normalizedBreadcrumbs = normalizeWebsiteSearchText(item.breadcrumbs.join(' '));
  const normalizedAliases = normalizeWebsiteSearchText((item.aliases || []).join(' '));

  if (!query) {
    return null;
  }

  let score = 0;
  const matchedTerms = new Set<string>();

  if (normalizedLabel === query) {
    score += 220;
    matchedTerms.add(query);
  } else if (normalizedLabel.startsWith(query)) {
    score += 180;
    matchedTerms.add(query);
  } else if (normalizedLabel.includes(query)) {
    score += 150;
    matchedTerms.add(query);
  }

  tokens.forEach((token) => {
    if (normalizedLabel === token) {
      score += 80;
      matchedTerms.add(token);
    } else if (normalizedLabel.startsWith(token)) {
      score += 64;
      matchedTerms.add(token);
    } else if (normalizedLabel.includes(token)) {
      score += 52;
      matchedTerms.add(token);
    }

    if (normalizedAliases.includes(token)) {
      score += 42;
      matchedTerms.add(token);
    }

    if (normalizedBreadcrumbs.includes(token)) {
      score += 28;
      matchedTerms.add(token);
    }

    if (normalizedDescription.includes(token)) {
      score += 20;
      matchedTerms.add(token);
    }

    if (normalizedValue.includes(token)) {
      score += 16;
      matchedTerms.add(token);
    }
  });

  expandedTokens.forEach((token) => {
    if (!tokens.includes(token) && (normalizedLabel.includes(token) || normalizedAliases.includes(token))) {
      score += 12;
      matchedTerms.add(token);
    }
  });

  if (!matchedTerms.size && isSubsequenceMatch(query.replace(/\s+/g, ''), normalizedLabel.replace(/\s+/g, ''))) {
    score += 24;
    matchedTerms.add(query);
  }

  if (!matchedTerms.size) {
    return null;
  }

  if (item.kind === 'field') score += 16;
  if (item.kind === 'row') score += 10;
  if (item.kind === 'group') score += 6;

  return {
    score,
    matchedTerms: uniqueTokens(Array.from(matchedTerms)),
  };
}

export function searchWebsiteSettings(items: WebsiteSearchItem[], rawQuery: string, limit = 12): WebsiteSearchResult[] {
  const query = normalizeWebsiteSearchText(rawQuery);
  const tokens = tokenizeWebsiteSearchText(rawQuery);
  const expandedTokens = expandWebsiteSearchTokens(tokens);

  if (!query) {
    return [];
  }

  return items
    .map((item) => {
      const scored = scoreItem(item, query, tokens, expandedTokens);
      if (!scored) return null;

      return {
        ...item,
        score: scored.score,
        matchedTerms: scored.matchedTerms,
        snippet: buildSnippet(item, scored.matchedTerms),
      } satisfies WebsiteSearchResult;
    })
    .filter((item): item is WebsiteSearchResult => Boolean(item))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.breadcrumbs.join(' > ').localeCompare(right.breadcrumbs.join(' > '));
    })
    .slice(0, limit);
}
