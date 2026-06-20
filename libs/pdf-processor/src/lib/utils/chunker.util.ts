export interface ChunkInfo {
  text: string;
  wordCount: number;
  charCount: number;
}

const MIN_CHUNK_WORDS = 50;
const MAX_CHUNK_WORDS = 300;
const TARGET_CHUNK_WORDS = 200;

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Split text by sentences, trying to avoid splitting abbreviations.
 */
export function splitBySentence(text: string): string[] {
  // A basic sentence splitter regex
  // Looks for . ! ? followed by space and capital letter
  return text.replace(/([.!?])\s+(?=[A-Z])/g, '$1|SPLIT|').split('|SPLIT|').map(s => s.trim()).filter(Boolean);
}

/**
 * Semantically split text into chunks.
 * Primary split: paragraphs (\n\n)
 * Secondary split: sentences (if paragraph too long)
 */
export function chunkText(cleanedText: string): ChunkInfo[] {
  if (!cleanedText) return [];

  // 1. Initial split by double newlines (paragraphs)
  const paragraphs = cleanedText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  
  let chunks: string[] = [];
  let currentBuffer: string[] = [];
  let currentWordCount = 0;

  // 2. First pass: group paragraphs into chunks
  for (const paragraph of paragraphs) {
    const wordCount = getWordCount(paragraph);

    // If a single paragraph is too large, we must split it by sentence
    if (wordCount > MAX_CHUNK_WORDS) {
      // Flush current buffer if it has content
      if (currentBuffer.length > 0) {
        chunks.push(currentBuffer.join('\n\n'));
        currentBuffer = [];
        currentWordCount = 0;
      }

      const sentences = splitBySentence(paragraph);
      let sentenceBuffer: string[] = [];
      let sentenceWordCount = 0;

      for (const sentence of sentences) {
        const sWordCount = getWordCount(sentence);
        
        if (sentenceWordCount + sWordCount > TARGET_CHUNK_WORDS && sentenceBuffer.length > 0) {
          chunks.push(sentenceBuffer.join(' '));
          sentenceBuffer = [];
          sentenceWordCount = 0;
        }
        
        sentenceBuffer.push(sentence);
        sentenceWordCount += sWordCount;
      }

      // Add remaining sentences
      if (sentenceBuffer.length > 0) {
        // If it's too small, keep it in the buffer for the next paragraph
        if (sentenceWordCount < MIN_CHUNK_WORDS) {
          currentBuffer.push(sentenceBuffer.join(' '));
          currentWordCount += sentenceWordCount;
        } else {
          chunks.push(sentenceBuffer.join(' '));
        }
      }
    } else {
      // Normal paragraph processing
      if (currentWordCount + wordCount > TARGET_CHUNK_WORDS && currentWordCount >= MIN_CHUNK_WORDS) {
        // Flush buffer
        chunks.push(currentBuffer.join('\n\n'));
        currentBuffer = [paragraph];
        currentWordCount = wordCount;
      } else {
        // Append to buffer
        currentBuffer.push(paragraph);
        currentWordCount += wordCount;
      }
    }
  }

  // Flush remaining buffer
  if (currentBuffer.length > 0) {
    // If it's too small and there are previous chunks, merge it backwards
    if (currentWordCount < MIN_CHUNK_WORDS && chunks.length > 0) {
      chunks[chunks.length - 1] += '\n\n' + currentBuffer.join('\n\n');
    } else {
      chunks.push(currentBuffer.join('\n\n'));
    }
  }

  // 3. Format output
  return chunks.map(chunk => ({
    text: chunk,
    wordCount: getWordCount(chunk),
    charCount: chunk.length
  }));
}
