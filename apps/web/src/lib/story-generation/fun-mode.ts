/**
 * Fun mode configuration helpers.
 * Pure functions to extract fun mode flags from parent/story metadata.
 */
import type { ParentConfig, StoryMetadata } from '@omegaread/db';

export function extraerFunModeConfig(rawConfig: unknown): boolean {
  if (!rawConfig || typeof rawConfig !== 'object') return false;
  const config = rawConfig as ParentConfig;
  return config.funMode === true;
}

export function extraerFunModeHistoria(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const storyMetadata = metadata as StoryMetadata;
  return storyMetadata.generationFlags?.funMode === true;
}
