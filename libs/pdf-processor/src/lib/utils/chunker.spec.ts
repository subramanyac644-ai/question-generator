import { splitBySentence, chunkText } from './chunker.util';

describe('Chunker Utilities', () => {
  describe('splitBySentence', () => {
    it('should split text on sentence boundaries followed by capital letters', () => {
      const text = 'This is the first sentence. And this is the second sentence! Here is a third? Yes, it is.';
      const result = splitBySentence(text);
      expect(result).toEqual([
        'This is the first sentence.',
        'And this is the second sentence!',
        'Here is a third?',
        'Yes, it is.'
      ]);
    });

    it('should not split abbreviations if the next word starts with lowercase', () => {
      const text = 'This is e.g. a test where it should not split. However, it will split on capital letter.';
      const result = splitBySentence(text);
      expect(result).toEqual([
        'This is e.g. a test where it should not split.',
        'However, it will split on capital letter.'
      ]);
    });
  });

  describe('chunkText', () => {
    it('should return empty array for empty inputs', () => {
      expect(chunkText('')).toEqual([]);
      expect(chunkText(null as any)).toEqual([]);
    });

    it('should keep a short document as a single chunk', () => {
      // Paragraph 1: 7 words
      // Paragraph 2: 7 words
      // Total 14 words (this is below MIN_CHUNK_WORDS, but since there is only one chunk, it returns it)
      const input = 'This is a short paragraph of text.\n\nHere is another short paragraph to test.';
      const chunks = chunkText(input);
      expect(chunks.length).toBe(1);
      expect(chunks[0].wordCount).toBe(14);
      expect(chunks[0].charCount).toBe(input.length);
      expect(chunks[0].text).toBe(input);
    });

    it('should group multiple paragraphs into a single chunk up to target size', () => {
      // Build several short paragraphs (~20 words each)
      const paragraphs = Array.from({ length: 5 }, (_, i) => 
        `Paragraph ${i + 1} with some filler words to increase the word count of this particular block so we reach the target.`
      );
      // Each has 20 words. 5 paragraphs * 20 = 100 words. This is below TARGET_CHUNK_WORDS (200) and MIN_CHUNK_WORDS (50) is satisfied.
      // They should all be grouped into a single chunk.
      const input = paragraphs.join('\n\n');
      const chunks = chunkText(input);

      expect(chunks.length).toBe(1);
      expect(chunks[0].wordCount).toBe(100);
      expect(chunks[0].text).toBe(input);
    });

    it('should split paragraphs when they exceed the target size', () => {
      // Create paragraphs that exceed TARGET_CHUNK_WORDS (200 words)
      // Paragraph 1: 150 words
      // Paragraph 2: 120 words
      // Total = 270 words. Since 150 + 120 = 270 > TARGET_CHUNK_WORDS (200), they should split into 2 chunks.
      const p1 = Array(150).fill('word').join(' ') + '.';
      const p2 = Array(120).fill('text').join(' ') + '.';
      const input = `${p1}\n\n${p2}`;
      
      const chunks = chunkText(input);
      expect(chunks.length).toBe(2);
      expect(chunks[0].text).toBe(p1);
      expect(chunks[1].text).toBe(p2);
    });

    it('should split a single massive paragraph by sentences', () => {
      // Paragraph 1: 450 words total, split into sentences of 110 words each
      // Sentence 1: 110 words
      // Sentence 2: 110 words
      // Sentence 3: 110 words
      // Sentence 4: 120 words
      // Max chunk size is 300, so it must split this paragraph.
      const s1 = 'One ' + Array(109).fill('one').join(' ') + '.';
      const s2 = 'Two ' + Array(109).fill('two').join(' ') + '.';
      const s3 = 'Three ' + Array(109).fill('three').join(' ') + '.';
      const s4 = 'Four ' + Array(119).fill('four').join(' ') + '.';
      const massiveParagraph = `${s1} ${s2} ${s3} ${s4}`;

      const chunks = chunkText(massiveParagraph);
      
      // Let's trace how the sentence buffer works:
      // s1 (110 words) - accumulated
      // s2 (110 words) -> s1 + s2 = 220 words. Since 110 + 110 > TARGET_CHUNK_WORDS (200), it flushes s1.
      // s3 (110 words) -> s2 + s3 = 220 words. Flushes s2.
      // s4 (120 words) -> s3 + s4 = 230 words. Flushes s3.
      // Remaining: s4. Since s4 is > MIN_CHUNK_WORDS (50), it becomes a separate chunk.
      // So total chunks should be 4.
      expect(chunks.length).toBe(4);
      expect(chunks[0].wordCount).toBe(110);
      expect(chunks[1].wordCount).toBe(110);
      expect(chunks[2].wordCount).toBe(110);
      expect(chunks[3].wordCount).toBe(120);
    });

    it('should merge small trailing chunks backward', () => {
      // Let's create a scenario where the final buffer has < MIN_CHUNK_WORDS (50 words)
      // Chunk 1: Paragraph of 210 words (flushed since > TARGET_CHUNK_WORDS)
      // Chunk 2: Paragraph of 30 words (remaining in buffer at end)
      // The remaining 30 words should be merged into Chunk 1.
      const p1 = Array(210).fill('first').join(' ') + '.';
      const p2 = Array(30).fill('second').join(' ') + '.';
      const input = `${p1}\n\n${p2}`;

      const chunks = chunkText(input);
      expect(chunks.length).toBe(1);
      expect(chunks[0].wordCount).toBe(240); // 210 + 30
      expect(chunks[0].text).toContain('first');
      expect(chunks[0].text).toContain('second');
    });
  });
});
