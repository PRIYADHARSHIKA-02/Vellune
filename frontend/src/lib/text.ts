/**
 * Helper to clean and summarize book descriptions to make them crisp,
 * non-spoiler, and exactly 3-4 lines (roughly 3 sentences).
 */
export const getCrispDescription = (text: string | null | undefined): string => {
  if (!text) return 'No description available for this book.';
  
  // Remove HTML tags
  let cleanText = text.replace(/<[^>]*>/g, '').trim();
  
  // Replace multiple spaces/newlines with single space
  cleanText = cleanText.replace(/\s+/g, ' ');
  
  // Mask abbreviations to prevent false sentence splits
  const ABBREVIATIONS = [
    { pattern: /\bJ\.K\./gi, placeholder: 'J_K_' },
    { pattern: /\bJ\.R\.R\./gi, placeholder: 'J_R_R_' },
    { pattern: /\be\.g\./gi, placeholder: 'e_g_' },
    { pattern: /\bi\.e\./gi, placeholder: 'i_e_' },
    { pattern: /\bMr\./gi, placeholder: 'Mr_' },
    { pattern: /\bMrs\./gi, placeholder: 'Mrs_' },
    { pattern: /\bDr\./gi, placeholder: 'Dr_' },
    { pattern: /\bSt\./gi, placeholder: 'St_' },
    { pattern: /\bvs\./gi, placeholder: 'vs_' },
    { pattern: /\bNo\./gi, placeholder: 'No_' },
  ];
  
  let maskedText = cleanText;
  for (const abb of ABBREVIATIONS) {
    maskedText = maskedText.replace(abb.pattern, abb.placeholder);
  }
  
  // Split into sentences using a regex matching sentence endings (. ! ?)
  const rawSentences = maskedText.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [maskedText];
  
  const cleanedSentences: string[] = [];
  
  for (let sentence of rawSentences) {
    let s = sentence.trim();
    
    // Restore abbreviations in the sentence
    for (const abb of ABBREVIATIONS) {
      const restorePattern = new RegExp(abb.placeholder, 'g');
      const originalText = abb.pattern.source.replace(/\\/g, ''); // strip backslashes
      s = s.replace(restorePattern, originalText);
    }
    
    // Remove leading promo badges/lists (e.g. "#1 New York Times Bestseller", "USA Today Bestseller")
    s = s.replace(/^(?:#?\d*\s*(?:New York Times|USA Today|Globe and Mail|Publishers Weekly|Sunday Times|Indie|Spiegel|Bestseller|bestseller|Bestselling|bestselling)s?\b[\s·•|,*:-]*)+/gi, '');
    s = s.trim();
    
    if (!s) continue;
    
    // Skip purely promotional sentences
    const isPromo = /^(?:stay up all night|readers obsessed|now a major motion picture|winner of the|award-winning|instant #?1|from the #?1|bestseller list|sensational.*thriller)/i.test(s);
    if (isPromo) {
      continue;
    }
    
    // Clean inline promo buzzwords
    s = s.replace(/\b(?:new york times\s+)?bestselling\s+/gi, '')
         .replace(/\b(?:new york times\s+)?bestseller\b/gi, 'book')
         .replace(/\bbestseller\s+/gi, '');
         
    cleanedSentences.push(s);
  }
  
  const sourceList = cleanedSentences.length > 0 ? cleanedSentences : rawSentences.map(s => {
    let restored = s.trim();
    for (const abb of ABBREVIATIONS) {
      const restorePattern = new RegExp(abb.placeholder, 'g');
      const originalText = abb.pattern.source.replace(/\\/g, '');
      restored = restored.replace(restorePattern, originalText);
    }
    return restored;
  }).filter(Boolean);
  
  // Limit to first 3 sentences for a crisp 3-4 line description
  const selectedSentences = sourceList.slice(0, 3);
  
  return selectedSentences.join(' ');
};
