import {
  normalizeWhitespace,
  removePageNumbers,
  removeRepeatingHeaders,
  removeBulletArtifacts,
  cleanText
} from './text-cleaner.util';

describe('Text Cleaner Utilities', () => {
  describe('normalizeWhitespace', () => {
    it('should handle empty or falsy inputs', () => {
      expect(normalizeWhitespace('')).toBe('');
      expect(normalizeWhitespace(null as any)).toBe('');
    });

    it('should replace multiple spaces and tabs with a single space', () => {
      const input = 'This   is \t a    spaced   out \t\t text.';
      const expected = 'This is a spaced out text.';
      expect(normalizeWhitespace(input)).toBe(expected);
    });

    it('should reduce three or more newlines to exactly two newlines', () => {
      const input = 'First paragraph.\n\n\n\nSecond paragraph.\n\n\nThird paragraph.';
      const expected = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      expect(normalizeWhitespace(input)).toBe(expected);
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '   \n  Hello World   \t\n ';
      expect(normalizeWhitespace(input)).toBe('Hello World');
    });
  });

  describe('removePageNumbers', () => {
    it('should handle empty inputs', () => {
      expect(removePageNumbers('')).toBe('');
    });

    it('should strip common page number formats on standalone lines', () => {
      const text = [
        'Introduction',
        'Page 1',
        'Some content here.',
        '12 of 34',
        'More content.',
        '- 5 -',
        'End of page.',
        '99'
      ].join('\n');

      const expected = [
        'Introduction',
        '',
        'Some content here.',
        '',
        'More content.',
        '',
        'End of page.',
        ''
      ].join('\n');

      expect(removePageNumbers(text)).toBe(expected);
    });

    it('should not strip numbers embedded in normal sentences', () => {
      const text = 'There are 12 items in group 1.';
      expect(removePageNumbers(text)).toBe(text);
    });
  });

  describe('removeRepeatingHeaders', () => {
    it('should handle empty inputs', () => {
      expect(removeRepeatingHeaders('')).toBe('');
    });

    it('should remove short lines that repeat more than 3 times', () => {
      const documentText = [
        'RUNNING HEADER',
        'Chapter 1',
        'This is the actual text of chapter 1.',
        'RUNNING HEADER',
        'Some more chapter content.',
        'RUNNING HEADER',
        'Continuing the story.',
        'RUNNING HEADER',
        'Concluding chapter 1.'
      ].join('\n');

      const expected = [
        'Chapter 1',
        'This is the actual text of chapter 1.',
        'Some more chapter content.',
        'Continuing the story.',
        'Concluding chapter 1.'
      ].join('\n');

      expect(removeRepeatingHeaders(documentText)).toBe(expected);
    });

    it('should not remove short lines that repeat 3 or fewer times', () => {
      const documentText = [
        'LESS REPEATED HEADER',
        'Chapter 1',
        'LESS REPEATED HEADER',
        'Chapter 2',
        'LESS REPEATED HEADER',
        'Chapter 3'
      ].join('\n');

      expect(removeRepeatingHeaders(documentText)).toBe(documentText);
    });

    it('should not remove repeating lines that are too long (> 100 characters)', () => {
      const longRepeatingLine = 'This is a very long line that repeats but should not be removed because it is a normal text sentence and we do not want to destroy actual content of the book';
      const documentText = [
        longRepeatingLine,
        'Paragraph 1',
        longRepeatingLine,
        'Paragraph 2',
        longRepeatingLine,
        'Paragraph 3',
        longRepeatingLine,
        'Paragraph 4'
      ].join('\n');

      expect(removeRepeatingHeaders(documentText)).toBe(documentText);
    });
  });

  describe('removeBulletArtifacts', () => {
    it('should handle empty inputs', () => {
      expect(removeBulletArtifacts('')).toBe('');
    });

    it('should replace special OCR bullet characters with a dash', () => {
      const input = ' First item\n• Second item\n◦ Third item\n Fourth item\n Fifth item';
      const expected = '- First item\n- Second item\n- Third item\n- Fourth item\n- Fifth item';
      expect(removeBulletArtifacts(input)).toBe(expected);
    });

    it('should standardize lists starting with - or *', () => {
      const input = '- First\n* Second';
      const expected = '- First\n- Second';
      expect(removeBulletArtifacts(input)).toBe(expected);
    });
  });

  describe('cleanText', () => {
    it('should pipeline all cleaning operations together', () => {
      const rawText = [
        'RUNNING HEADER v1',
        '',
        ' Welcome to the Course!',
        '',
        'This is a sample paragraph.    It has weird spaces.',
        '',
        'Page 1',
        '',
        'RUNNING HEADER v1',
        '',
        '• Course structure:',
        '* Module 1',
        '',
        'Page 2',
        '',
        'RUNNING HEADER v1',
        '',
        '- Final thoughts',
        '',
        'Page 3',
        '',
        'RUNNING HEADER v1'
      ].join('\n');

      const cleaned = cleanText(rawText);

      // Check:
      // - RUNNING HEADER v1 is removed (repeated 4 times)
      // - Page numbers Page X are removed
      // - Bullet artifacts are converted to -
      // - Whitespaces are normalized
      expect(cleaned).not.toContain('RUNNING HEADER v1');
      expect(cleaned).not.toContain('Page 1');
      expect(cleaned).not.toContain('Page 2');
      expect(cleaned).not.toContain('Page 3');
      expect(cleaned).toContain('- Welcome to the Course!');
      expect(cleaned).toContain('This is a sample paragraph. It has weird spaces.');
      expect(cleaned).toContain('- Course structure:\n- Module 1');
      expect(cleaned).toContain('- Final thoughts');
    });
  });
});
