export function normalizeWhitespace(text: string): string {
  if (!text) return '';
  return text
    // Replace multiple newlines with double newline (paragraph boundary)
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple spaces/tabs with single space
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function removePageNumbers(text: string): string {
  if (!text) return '';
  return text
    // Matches "Page X", "- X -", "X of Y" on a single line
    .replace(/^\s*(Page\s*\d+|\d+\s*of\s*\d+|-\s*\d+\s*-|\d+)\s*$/gim, '')
    // Also remove lines that only have one or two digits
    .replace(/^\s*\d{1,2}\s*$/gim, '');
}

export function removeRepeatingHeaders(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const uniqueLines: string[] = [];
  const headerCandidates = new Map<string, number>();

  // Count frequencies of short lines (potential headers/footers)
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length < 100) {
      headerCandidates.set(trimmed, (headerCandidates.get(trimmed) || 0) + 1);
    }
  });

  // Reconstruct text, omitting lines that repeat too often (e.g. > 3 times)
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      uniqueLines.push(line);
      return;
    }
    
    if (trimmed.length < 100 && (headerCandidates.get(trimmed) || 0) > 3) {
      // It's likely a repeating header/footer, skip it
      return;
    }
    uniqueLines.push(line);
  });

  return uniqueLines.join('\n');
}

export function removeBulletArtifacts(text: string): string {
  if (!text) return '';
  return text
    // Replace weird OCR characters often used for bullets
    .replace(/[•◦]/g, '-')
    // Clean up scattered bullet indicators
    .replace(/^[-*]\s*/gm, '- ');
}

export function cleanText(rawText: string): string {
  let cleaned = rawText;
  cleaned = removePageNumbers(cleaned);
  cleaned = removeRepeatingHeaders(cleaned);
  cleaned = removeBulletArtifacts(cleaned);
  cleaned = normalizeWhitespace(cleaned);
  return cleaned;
}
