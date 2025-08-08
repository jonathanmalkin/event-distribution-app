/**
 * Data sanitization utilities for WordPress imports and user input
 */

/**
 * Decode HTML entities commonly found in WordPress data
 */
export function decodeHTMLEntities(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const htmlEntities: { [key: string]: string } = {
    '&#8211;': '–',  // en dash
    '&#8212;': '—',  // em dash
    '&#038;': '&',   // ampersand
    '&#8217;': "'",  // right single quotation mark
    '&#8216;': "'",  // left single quotation mark
    '&#8220;': '"',  // left double quotation mark
    '&#8221;': '"',  // right double quotation mark
    '&amp;': '&',    // ampersand
    '&lt;': '<',     // less than
    '&gt;': '>',     // greater than
    '&quot;': '"',   // quotation mark
    '&#39;': "'",    // apostrophe
    '&nbsp;': ' ',   // non-breaking space
  };

  let decoded = text;
  Object.entries(htmlEntities).forEach(([entity, replacement]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
  });

  return decoded;
}

/**
 * Sanitize venue name for consistent display
 */
export function sanitizeVenueName(name: string): string {
  if (!name) return name;
  
  return decodeHTMLEntities(name.trim());
}

/**
 * Sanitize WordPress content for safe database storage
 */
export function sanitizeWordPressContent(content: string): string {
  if (!content) return content;
  
  // Decode HTML entities
  let sanitized = decodeHTMLEntities(content);
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(cleaned) ? cleaned : null;
}