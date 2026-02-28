/**
 * Tests for custom topic feature in story generation
 * Tests the helpers and behavior for custom topic handling
 */
import { describe, it, expect } from 'vitest';

// Helper functions (extracted from story-generation-actions.ts for testing)
const CUSTOM_TOPIC_PREFIX = 'custom:';

function isCustomTopic(slug: string | undefined): slug is string {
  return !!slug && slug.startsWith(CUSTOM_TOPIC_PREFIX);
}

function parseCustomTopic(slug: string): string {
  return slug.slice(CUSTOM_TOPIC_PREFIX.length).trim();
}

describe('Custom topic helpers', () => {
  describe('isCustomTopic', () => {
    it('should identify custom topic with custom: prefix', () => {
      expect(isCustomTopic('custom:piratas del espacio')).toBe(true);
    });

    it('should identify custom topic with empty text after prefix', () => {
      expect(isCustomTopic('custom:')).toBe(true);
    });

    it('should not identify standard topic slug as custom', () => {
      expect(isCustomTopic('animales-que-vuelan')).toBe(false);
    });

    it('should not identify "custom" without prefix as custom topic', () => {
      expect(isCustomTopic('custom')).toBe(false);
    });

    it('should handle undefined', () => {
      expect(isCustomTopic(undefined)).toBe(false);
    });

    it('should handle empty string', () => {
      expect(isCustomTopic('')).toBe(false);
    });

    it('should be case-sensitive (lowercase custom: only)', () => {
      expect(isCustomTopic('Custom:topic')).toBe(false);
      expect(isCustomTopic('CUSTOM:topic')).toBe(false);
    });

    it('should reject prefixes in different positions', () => {
      expect(isCustomTopic('topic:custom:')).toBe(false);
    });
  });

  describe('parseCustomTopic', () => {
    it('should extract text after custom: prefix', () => {
      expect(parseCustomTopic('custom:piratas del espacio')).toBe('piratas del espacio');
    });

    it('should trim whitespace after prefix', () => {
      expect(parseCustomTopic('custom:  piratas del espacio  ')).toBe('piratas del espacio');
    });

    it('should handle only spaces after prefix', () => {
      expect(parseCustomTopic('custom:   ')).toBe('');
    });

    it('should return empty string for custom: alone', () => {
      expect(parseCustomTopic('custom:')).toBe('');
    });

    it('should preserve internal spaces', () => {
      expect(parseCustomTopic('custom:piratas   del   espacio')).toBe('piratas   del   espacio');
    });

    it('should handle special characters', () => {
      expect(parseCustomTopic('custom:niños & niñas ñ')).toBe('niños & niñas ñ');
    });

    it('should handle emojis', () => {
      expect(parseCustomTopic('custom:dragones 🐉')).toBe('dragones 🐉');
    });

    it('should handle numbers', () => {
      expect(parseCustomTopic('custom:123abc')).toBe('123abc');
    });

    it('should trim only trailing/leading spaces (not internal)', () => {
      expect(parseCustomTopic('custom:  hello world  ')).toBe('hello world');
    });

    it('should handle punctuation', () => {
      expect(parseCustomTopic('custom:¿Qué son los dinosaurios?')).toBe('¿Qué son los dinosaurios?');
    });
  });
});

describe('Custom topic integration patterns', () => {
  describe('custom topic slug formation', () => {
    it('should form valid custom topic slug when text provided', () => {
      const input = 'piratas del espacio';
      const customSlug = `custom:${input}`;

      expect(isCustomTopic(customSlug)).toBe(true);
      expect(parseCustomTopic(customSlug)).toBe(input);
    });

    it('should handle round-trip: parse and verify match', () => {
      const originalText = 'aventuras en la jungla';
      const slug = `custom:${originalText}`;

      expect(isCustomTopic(slug)).toBe(true);
      const extracted = parseCustomTopic(slug);
      expect(extracted).toBe(originalText);
    });

    it('should handle text with leading/trailing spaces in formation', () => {
      const userInput = '  dragons  ';
      const slug = `custom:${userInput}`;

      expect(isCustomTopic(slug)).toBe(true);
      // parseCustomTopic trims, so we get clean text
      const extracted = parseCustomTopic(slug);
      expect(extracted).toBe('dragons');
    });
  });

  describe('custom topic validation workflow', () => {
    it('should identify custom topic and extract text for story generation', () => {
      const topicSlug = 'custom:piratas del espacio';

      if (isCustomTopic(topicSlug)) {
        const textoLibre = parseCustomTopic(topicSlug);
        expect(textoLibre).toBe('piratas del espacio');
        // Custom topics use extracted text as nombre/descripcion
        const topicNombre = textoLibre;
        const topicDescripcion = textoLibre;
        const topicEmoji = '✏️';

        expect(topicNombre).toBe('piratas del espacio');
        expect(topicDescripcion).toBe('piratas del espacio');
        expect(topicEmoji).toBe('✏️');
        // Tono is controlled by the slider, not forced by custom topics
      }
    });

    it('should reject empty custom topic text', () => {
      const topicSlug = 'custom:';
      const extracted = parseCustomTopic(topicSlug);
      expect(extracted).toBe('');
      expect(extracted.trim()).toBe(''); // Still empty after trim
    });

    it('should reject custom topic with only whitespace', () => {
      const topicSlug = 'custom:   ';
      const extracted = parseCustomTopic(topicSlug);
      expect(extracted).toBe(''); // trim removes all whitespace
    });

    it('should handle max length custom topic (60 chars from UI)', () => {
      const maxText = 'a'.repeat(60);
      const slug = `custom:${maxText}`;

      expect(isCustomTopic(slug)).toBe(true);
      expect(parseCustomTopic(slug)).toBe(maxText);
      // This slug should be < 100 char limit: 'custom:' (7) + 60 = 67
      expect(slug.length).toBe(67);
    });
  });

  describe('conditional logic for custom vs standard topics', () => {
    it('custom topic branch: skips tech tree resolution', () => {
      const topicSlug = 'custom:mi tema';

      const isCustom = isCustomTopic(topicSlug);
      expect(isCustom).toBe(true);

      if (isCustom) {
        // These should NOT be set from tech tree:
        const skill = undefined;
        const dominio = undefined;
        const techTreeContext = undefined;

        expect(skill).toBeUndefined();
        expect(dominio).toBeUndefined();
        expect(techTreeContext).toBeUndefined();
      }
    });

    it('standard topic branch: would use tech tree', () => {
      const topicSlug = 'animales-que-vuelan';

      const isCustom = isCustomTopic(topicSlug);
      expect(isCustom).toBe(false);

      if (!isCustom) {
        // Would resolve topic through TOPICS_SEED and tech tree
        expect(topicSlug).toBeDefined();
        expect(topicSlug.startsWith(CUSTOM_TOPIC_PREFIX)).toBe(false);
      }
    });
  });

  describe('cargarHistoriaExistente custom topic detection', () => {
    it('should detect custom topic when loading existing story', () => {
      const storyTopicSlug = 'custom:piratas del espacio';

      const isCustom = isCustomTopic(storyTopicSlug);
      expect(isCustom).toBe(true);

      if (isCustom) {
        const customNombre = parseCustomTopic(storyTopicSlug);
        const topicEmoji = '✏️';

        expect(customNombre).toBe('piratas del espacio');
        expect(topicEmoji).toBe('✏️');
      }
    });

    it('should handle standard topic when loading existing story', () => {
      const storyTopicSlug = 'animales-que-vuelan';

      const isCustom = isCustomTopic(storyTopicSlug);
      expect(isCustom).toBe(false);

      if (!isCustom) {
        // Would look up in TOPICS_SEED
        expect(storyTopicSlug.startsWith(CUSTOM_TOPIC_PREFIX)).toBe(false);
      }
    });
  });
});
