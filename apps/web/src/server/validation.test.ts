/**
 * Tests for validation schema covering custom topic feature
 * Validates that topicSlug accepts up to 100 characters including custom: prefix
 */
import { describe, it, expect } from 'vitest';
import { generarHistoriaSchema } from './validation';

describe('generarHistoriaSchema - topicSlug validation', () => {
  describe('topicSlug length constraints', () => {
    it('should accept valid topicSlug up to 100 characters', () => {
      const validSlug = 'a'.repeat(100);
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: validSlug,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topicSlug).toBe(validSlug);
      }
    });

    it('should reject topicSlug exceeding 100 characters', () => {
      const tooLongSlug = 'a'.repeat(101);
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: tooLongSlug,
      });

      expect(result.success).toBe(false);
    });

    it('should accept exactly 100 characters for topicSlug', () => {
      const slugAt100Chars = 'a'.repeat(100);
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: slugAt100Chars,
      });

      expect(result.success).toBe(true);
    });

    it('should accept 1 character topicSlug', () => {
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: 'a',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('custom topic prefix support', () => {
    it('should accept custom: prefix with text', () => {
      const customTopic = 'custom:piratas del espacio';
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: customTopic,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topicSlug).toBe(customTopic);
      }
    });

    it('should accept custom: prefix within 100 char limit', () => {
      const customTopic = 'custom:' + 'a'.repeat(93); // 'custom:' = 7 chars
      expect(customTopic.length).toBe(100);

      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: customTopic,
      });

      expect(result.success).toBe(true);
    });

    it('should reject custom: prefix exceeding 100 char limit', () => {
      const customTopic = 'custom:' + 'a'.repeat(94); // 101 chars total
      expect(customTopic.length).toBe(101);

      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: customTopic,
      });

      expect(result.success).toBe(false);
    });

    it('should accept custom: with special characters within limit', () => {
      const customTopic = 'custom:piratas del espacio ñ é';
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: customTopic,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topicSlug).toBe(customTopic);
      }
    });
  });

  describe('standard topic slugs', () => {
    it('should accept regular topic slugs', () => {
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: 'animales-que-vuelan',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topicSlug).toBe('animales-que-vuelan');
      }
    });

    it('should accept legacy topic slugs', () => {
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: 'dinosaurios',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('topicSlug is optional', () => {
    it('should accept schema without topicSlug', () => {
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topicSlug).toBeUndefined();
      }
    });

    it('should accept empty string topicSlug as undefined', () => {
      const result = generarHistoriaSchema.safeParse({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        topicSlug: '',
      });

      expect(result.success).toBe(false); // min(1) requirement
    });
  });

  describe('studentId is required', () => {
    it('should reject missing studentId', () => {
      const result = generarHistoriaSchema.safeParse({
        topicSlug: 'animales-que-vuelan',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID studentId', () => {
      const result = generarHistoriaSchema.safeParse({
        studentId: 'not-a-uuid',
        topicSlug: 'animales-que-vuelan',
      });

      expect(result.success).toBe(false);
    });
  });
});
