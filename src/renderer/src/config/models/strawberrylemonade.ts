/**
 * Strawberrylemonade-L3-70B-v1.1 Model Configuration
 * Cherry Studio Integration - Phase 0
 *
 * This module defines the model configurations for the Strawberrylemonade-L3-70B-v1.1
 * model deployed via Ollama. Supports multiple quantization levels based on available
 * hardware.
 *
 * Target Hardware: AMD Ryzen 7 7700X, 32GB RAM, NVIDIA RTX 5090 (32GB VRAM)
 * Recommended Quantization: Q5_K_M or Q6_K
 *
 * @author Cherry Studio Integration Team
 * @version 1.0.0
 */

import type { Model } from '@renderer/types'

/**
 * Base configuration for Strawberrylemonade model family
 */
const STRAWBERRYLEMONADE_BASE_CONFIG = {
  providerId: 'ollama' as const,
  contextLength: 16384, // Llama 3.3 context window
  maxTokens: 4096, // Default max output tokens
  description:
    'Local 70B parameter model optimized for roleplay and storytelling. ' +
    'Merge of GeneticLemonade variants based on Llama 3.3 architecture.',
  capabilities: [
    'chat',
    'creative-writing',
    'roleplay',
    'long-form-generation',
    'storytelling',
    'character-consistency'
  ] as const,
  tags: ['local', 'llama3', '70b', 'roleplay', 'uncensored'] as const,
  isLocal: true,
  isActive: true
}

/**
 * Q4_K_M Quantization (Recommended for 32GB RAM + 16-24GB VRAM)
 * - File Size: ~40GB
 * - VRAM Required: 24GB (full offload) or 12GB+ (partial)
 * - Quality: Good (minimal perceptible loss)
 * - Speed: Fast (20-40 tokens/sec on RTX 5090)
 */
export const strawberrylemonade70bQ4: Model = {
  ...STRAWBERRYLEMONADE_BASE_CONFIG,
  id: 'strawberrylemonade-70b-q4',
  name: 'Strawberrylemonade 70B (Q4_K_M)',
  modelId: 'strawberrylemonade-70b-q4:latest',
  group: 'Strawberrylemonade',
  priority: 2, // Second choice
  tags: [...STRAWBERRYLEMONADE_BASE_CONFIG.tags, 'q4', 'balanced'] as const,
  description:
    STRAWBERRYLEMONADE_BASE_CONFIG.description +
    ' Q4_K_M quantization offers excellent quality/performance balance for most use cases.'
}

/**
 * Q5_K_M Quantization (RECOMMENDED for RTX 5090 - 32GB VRAM)
 * - File Size: ~48GB
 * - VRAM Required: 30GB (full offload) or 16GB+ (partial)
 * - Quality: Excellent (near-FP16 quality)
 * - Speed: Fast (15-35 tokens/sec on RTX 5090)
 */
export const strawberrylemonade70bQ5: Model = {
  ...STRAWBERRYLEMONADE_BASE_CONFIG,
  id: 'strawberrylemonade-70b-q5',
  name: 'Strawberrylemonade 70B (Q5_K_M)',
  modelId: 'strawberrylemonade-70b-q5:latest',
  group: 'Strawberrylemonade',
  priority: 1, // Primary recommendation for RTX 5090
  tags: [...STRAWBERRYLEMONADE_BASE_CONFIG.tags, 'q5', 'high-quality'] as const,
  description:
    STRAWBERRYLEMONADE_BASE_CONFIG.description +
    ' Q5_K_M quantization provides near-original quality with minimal quality loss. ' +
    'Recommended for systems with 30GB+ VRAM (RTX 5090, A6000).'
}

/**
 * Q6_K Quantization (OPTIMAL for RTX 5090 - Maximum Quality)
 * - File Size: ~54GB
 * - VRAM Required: 36GB (full offload requires A6000/H100 class or hybrid mode)
 * - Quality: Excellent (virtually indistinguishable from FP16)
 * - Speed: Good (12-30 tokens/sec on RTX 5090)
 */
export const strawberrylemonade70bQ6: Model = {
  ...STRAWBERRYLEMONADE_BASE_CONFIG,
  id: 'strawberrylemonade-70b-q6',
  name: 'Strawberrylemonade 70B (Q6_K)',
  modelId: 'strawberrylemonade-70b-q6:latest',
  group: 'Strawberrylemonade',
  priority: 0, // Highest priority for quality-focused users
  tags: [...STRAWBERRYLEMONADE_BASE_CONFIG.tags, 'q6', 'maximum-quality'] as const,
  description:
    STRAWBERRYLEMONADE_BASE_CONFIG.description +
    ' Q6_K quantization delivers near-perfect quality with negligible loss from FP16. ' +
    'Best for professional use and maximum coherence in long-form narratives.'
}

/**
 * Q8_0 Quantization (ENTHUSIAST - Requires 48GB+ VRAM or heavy CPU use)
 * - File Size: ~70GB
 * - VRAM Required: 48GB (full offload on H100/MI200) or CPU-heavy hybrid
 * - Quality: Near-Perfect (< 0.2% loss from FP16)
 * - Speed: Moderate (10-25 tokens/sec on RTX 5090 hybrid mode)
 */
export const strawberrylemonade70bQ8: Model = {
  ...STRAWBERRYLEMONADE_BASE_CONFIG,
  id: 'strawberrylemonade-70b-q8',
  name: 'Strawberrylemonade 70B (Q8_0)',
  modelId: 'strawberrylemonade-70b-q8:latest',
  group: 'Strawberrylemonade',
  priority: -1, // Lower priority (enthusiast only)
  tags: [...STRAWBERRYLEMONADE_BASE_CONFIG.tags, 'q8', 'maximum-quality', 'enthusiast'] as const,
  description:
    STRAWBERRYLEMONADE_BASE_CONFIG.description +
    ' Q8_0 quantization provides maximum quality with negligible perceptual difference from FP16. ' +
    'Requires enterprise-grade hardware or hybrid CPU/GPU mode.'
}

/**
 * All Strawberrylemonade model variants
 * Ordered by priority (highest to lowest)
 */
export const STRAWBERRYLEMONADE_MODELS: Model[] = [
  strawberrylemonade70bQ6, // Priority 0 - Highest quality
  strawberrylemonade70bQ5, // Priority 1 - Recommended for RTX 5090
  strawberrylemonade70bQ4, // Priority 2 - Balanced
  strawberrylemonade70bQ8 // Priority -1 - Enthusiast only
]

/**
 * Get recommended model based on available VRAM
 * @param vramGB Available VRAM in gigabytes
 * @returns Recommended model configuration
 */
export function getRecommendedStrawberrylemonadeModel(vramGB: number): Model {
  if (vramGB >= 32) {
    // RTX 5090, A6000, or better
    return strawberrylemonade70bQ5 // Q5_K_M is sweet spot for 32GB
  } else if (vramGB >= 24) {
    // RTX 4090, RTX 3090, A5000
    return strawberrylemonade70bQ4 // Q4_K_M fits comfortably
  } else if (vramGB >= 16) {
    // RTX 4060 Ti 16GB, partial offload
    return strawberrylemonade70bQ4 // Q4_K_M with partial offload
  } else {
    // Limited VRAM, CPU-heavy inference
    return strawberrylemonade70bQ4 // Q4_K_M with CPU
  }
}

/**
 * Check if system can run Strawberrylemonade models
 * @param ramGB Total system RAM in gigabytes
 * @param vramGB Available GPU VRAM in gigabytes (0 for CPU-only)
 * @returns Object with canRun status and recommended model
 */
export function validateStrawberrylemonadeRequirements(
  ramGB: number,
  vramGB: number = 0
): {
  canRun: boolean
  recommended: Model | null
  warnings: string[]
} {
  const warnings: string[] = []

  // Minimum RAM requirement
  if (ramGB < 32) {
    return {
      canRun: false,
      recommended: null,
      warnings: [
        `Insufficient RAM: ${ramGB}GB (minimum: 32GB)`,
        'Cannot run 70B model - please upgrade system memory'
      ]
    }
  }

  // Check for GPU
  if (vramGB === 0) {
    warnings.push('No GPU detected - inference will be CPU-only and very slow (2-5 tokens/sec)')
    warnings.push('Recommend adding NVIDIA GPU with 24GB+ VRAM for 10-20x speedup')
  } else if (vramGB < 16) {
    warnings.push(
      `Limited VRAM: ${vramGB}GB - will use hybrid CPU/GPU inference (slower than full offload)`
    )
  }

  const recommended = getRecommendedStrawberrylemonadeModel(vramGB)

  return {
    canRun: true,
    recommended,
    warnings
  }
}

/**
 * Export default configuration (Q5_K_M for RTX 5090 target)
 */
export default strawberrylemonade70bQ5
