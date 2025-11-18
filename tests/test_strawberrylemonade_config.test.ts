/**
 * Unit Tests for Strawberrylemonade Model Configuration
 * Cherry Studio Integration - Phase 0
 *
 * Tests model configuration, validation logic, and recommendation engine.
 *
 * @author Cherry Studio Integration Team
 * @version 1.0.0
 */

import { describe, expect, it, test } from 'vitest'
import {
  getRecommendedStrawberrylemonadeModel,
  STRAWBERRYLEMONADE_MODELS,
  strawberrylemonade70bQ4,
  strawberrylemonade70bQ5,
  strawberrylemonade70bQ6,
  strawberrylemonade70bQ8,
  validateStrawberrylemonadeRequirements
} from '../src/renderer/src/config/models/strawberrylemonade'
import type { Model } from '../src/renderer/src/types'

describe('Strawberrylemonade Model Configurations', () => {
  describe('Model Object Structure', () => {
    test('Q4_K_M model has correct base configuration', () => {
      expect(strawberrylemonade70bQ4).toBeDefined()
      expect(strawberrylemonade70bQ4.id).toBe('strawberrylemonade-70b-q4')
      expect(strawberrylemonade70bQ4.name).toBe('Strawberrylemonade 70B (Q4_K_M)')
      expect(strawberrylemonade70bQ4.modelId).toBe('strawberrylemonade-70b-q4:latest')
      expect(strawberrylemonade70bQ4.providerId).toBe('ollama')
      expect(strawberrylemonade70bQ4.contextLength).toBe(16384)
      expect(strawberrylemonade70bQ4.maxTokens).toBe(4096)
      expect(strawberrylemonade70bQ4.isLocal).toBe(true)
      expect(strawberrylemonade70bQ4.isActive).toBe(true)
    })

    test('Q5_K_M model has correct configuration', () => {
      expect(strawberrylemonade70bQ5).toBeDefined()
      expect(strawberrylemonade70bQ5.id).toBe('strawberrylemonade-70b-q5')
      expect(strawberrylemonade70bQ5.name).toBe('Strawberrylemonade 70B (Q5_K_M)')
      expect(strawberrylemonade70bQ5.modelId).toBe('strawberrylemonade-70b-q5:latest')
      expect(strawberrylemonade70bQ5.priority).toBe(1) // Primary recommendation
      expect(strawberrylemonade70bQ5.group).toBe('Strawberrylemonade')
    })

    test('Q6_K model has correct configuration', () => {
      expect(strawberrylemonade70bQ6).toBeDefined()
      expect(strawberrylemonade70bQ6.id).toBe('strawberrylemonade-70b-q6')
      expect(strawberrylemonade70bQ6.name).toBe('Strawberrylemonade 70B (Q6_K)')
      expect(strawberrylemonade70bQ6.priority).toBe(0) // Highest priority
      expect(strawberrylemonade70bQ6.tags).toContain('q6')
      expect(strawberrylemonade70bQ6.tags).toContain('maximum-quality')
    })

    test('Q8_0 model has correct configuration', () => {
      expect(strawberrylemonade70bQ8).toBeDefined()
      expect(strawberrylemonade70bQ8.id).toBe('strawberrylemonade-70b-q8')
      expect(strawberrylemonade70bQ8.name).toBe('Strawberrylemonade 70B (Q8_0)')
      expect(strawberrylemonade70bQ8.priority).toBe(-1) // Lower priority
      expect(strawberrylemonade70bQ8.tags).toContain('enthusiast')
    })

    test('All models have required capabilities', () => {
      const requiredCapabilities = [
        'chat',
        'creative-writing',
        'roleplay',
        'long-form-generation',
        'storytelling',
        'character-consistency'
      ]

      STRAWBERRYLEMONADE_MODELS.forEach((model) => {
        expect(model.capabilities).toBeDefined()
        requiredCapabilities.forEach((capability) => {
          expect(model.capabilities).toContain(capability)
        })
      })
    })

    test('All models have consistent base tags', () => {
      const baseTags = ['local', 'llama3', '70b', 'roleplay', 'uncensored']

      STRAWBERRYLEMONADE_MODELS.forEach((model) => {
        baseTags.forEach((tag) => {
          expect(model.tags).toContain(tag)
        })
      })
    })

    test('Each model has unique quantization tag', () => {
      expect(strawberrylemonade70bQ4.tags).toContain('q4')
      expect(strawberrylemonade70bQ5.tags).toContain('q5')
      expect(strawberrylemonade70bQ6.tags).toContain('q6')
      expect(strawberrylemonade70bQ8.tags).toContain('q8')
    })
  })

  describe('Model Array Export', () => {
    test('STRAWBERRYLEMONADE_MODELS contains all variants', () => {
      expect(STRAWBERRYLEMONADE_MODELS).toHaveLength(4)
      expect(STRAWBERRYLEMONADE_MODELS).toContain(strawberrylemonade70bQ4)
      expect(STRAWBERRYLEMONADE_MODELS).toContain(strawberrylemonade70bQ5)
      expect(STRAWBERRYLEMONADE_MODELS).toContain(strawberrylemonade70bQ6)
      expect(STRAWBERRYLEMONADE_MODELS).toContain(strawberrylemonade70bQ8)
    })

    test('Models are ordered by priority (highest to lowest)', () => {
      expect(STRAWBERRYLEMONADE_MODELS[0].priority).toBe(0) // Q6
      expect(STRAWBERRYLEMONADE_MODELS[1].priority).toBe(1) // Q5
      expect(STRAWBERRYLEMONADE_MODELS[2].priority).toBe(2) // Q4
      expect(STRAWBERRYLEMONADE_MODELS[3].priority).toBe(-1) // Q8
    })

    test('All models belong to Strawberrylemonade group', () => {
      STRAWBERRYLEMONADE_MODELS.forEach((model) => {
        expect(model.group).toBe('Strawberrylemonade')
      })
    })
  })

  describe('getRecommendedStrawberrylemonadeModel()', () => {
    test('Recommends Q5_K_M for 32GB VRAM (RTX 5090)', () => {
      const recommended = getRecommendedStrawberrylemonadeModel(32)
      expect(recommended.id).toBe('strawberrylemonade-70b-q5')
      expect(recommended.name).toContain('Q5_K_M')
    })

    test('Recommends Q5_K_M for 36GB+ VRAM (A6000)', () => {
      const recommended = getRecommendedStrawberrylemonadeModel(40)
      expect(recommended.id).toBe('strawberrylemonade-70b-q5')
    })

    test('Recommends Q4_K_M for 24GB VRAM (RTX 4090)', () => {
      const recommended = getRecommendedStrawberrylemonadeModel(24)
      expect(recommended.id).toBe('strawberrylemonade-70b-q4')
      expect(recommended.name).toContain('Q4_K_M')
    })

    test('Recommends Q4_K_M for 16GB VRAM (RTX 4060 Ti)', () => {
      const recommended = getRecommendedStrawberrylemonadeModel(16)
      expect(recommended.id).toBe('strawberrylemonade-70b-q4')
    })

    test('Recommends Q4_K_M for low VRAM (8GB)', () => {
      const recommended = getRecommendedStrawberrylemonadeModel(8)
      expect(recommended.id).toBe('strawberrylemonade-70b-q4')
    })

    test('Recommends Q4_K_M for CPU-only (0 VRAM)', () => {
      const recommended = getRecommendedStrawberrylemonadeModel(0)
      expect(recommended.id).toBe('strawberrylemonade-70b-q4')
    })

    test('Returns valid Model object', () => {
      const recommended = getRecommendedStrawberrylemonadeModel(32)
      expect(recommended).toHaveProperty('id')
      expect(recommended).toHaveProperty('name')
      expect(recommended).toHaveProperty('modelId')
      expect(recommended).toHaveProperty('providerId')
      expect(recommended.providerId).toBe('ollama')
    })
  })

  describe('validateStrawberrylemonadeRequirements()', () => {
    describe('Sufficient RAM scenarios', () => {
      test('Passes validation with 32GB RAM and 32GB VRAM (RTX 5090)', () => {
        const result = validateStrawberrylemonadeRequirements(32, 32)

        expect(result.canRun).toBe(true)
        expect(result.recommended).toBeDefined()
        expect(result.recommended?.id).toBe('strawberrylemonade-70b-q5')
        expect(result.warnings).toHaveLength(0)
      })

      test('Passes validation with 32GB RAM and 24GB VRAM (RTX 4090)', () => {
        const result = validateStrawberrylemonadeRequirements(32, 24)

        expect(result.canRun).toBe(true)
        expect(result.recommended?.id).toBe('strawberrylemonade-70b-q4')
        expect(result.warnings).toHaveLength(0)
      })

      test('Passes validation with 40GB RAM and 24GB VRAM', () => {
        const result = validateStrawberrylemonadeRequirements(40, 24)

        expect(result.canRun).toBe(true)
        expect(result.recommended).toBeDefined()
        expect(result.warnings).toHaveLength(0)
      })

      test('Passes validation with 64GB RAM and 48GB VRAM', () => {
        const result = validateStrawberrylemonadeRequirements(64, 48)

        expect(result.canRun).toBe(true)
        expect(result.recommended).toBeDefined()
      })
    })

    describe('Insufficient RAM scenarios', () => {
      test('Fails validation with 16GB RAM', () => {
        const result = validateStrawberrylemonadeRequirements(16, 24)

        expect(result.canRun).toBe(false)
        expect(result.recommended).toBeNull()
        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.warnings.some((w) => w.includes('Insufficient RAM'))).toBe(true)
      })

      test('Fails validation with 24GB RAM', () => {
        const result = validateStrawberrylemonadeRequirements(24, 32)

        expect(result.canRun).toBe(false)
        expect(result.recommended).toBeNull()
      })

      test('Fails validation with 8GB RAM', () => {
        const result = validateStrawberrylemonadeRequirements(8, 16)

        expect(result.canRun).toBe(false)
        expect(result.warnings).toContain('Insufficient RAM: 8GB (minimum: 32GB)')
      })

      test('Provides upgrade recommendation in warnings', () => {
        const result = validateStrawberrylemonadeRequirements(16)

        expect(result.warnings.some((w) => w.includes('upgrade'))).toBe(true)
      })
    })

    describe('GPU availability scenarios', () => {
      test('Warns about CPU-only mode when VRAM is 0', () => {
        const result = validateStrawberrylemonadeRequirements(32, 0)

        expect(result.canRun).toBe(true)
        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.warnings.some((w) => w.includes('CPU-only'))).toBe(true)
        expect(result.warnings.some((w) => w.includes('slow'))).toBe(true)
      })

      test('Warns about limited VRAM (12GB)', () => {
        const result = validateStrawberrylemonadeRequirements(32, 12)

        expect(result.canRun).toBe(true)
        expect(result.warnings.some((w) => w.includes('Limited VRAM'))).toBe(true)
        expect(result.warnings.some((w) => w.includes('hybrid'))).toBe(true)
      })

      test('Recommends GPU upgrade for CPU-only', () => {
        const result = validateStrawberrylemonadeRequirements(32, 0)

        expect(
          result.warnings.some((w) => w.includes('NVIDIA GPU') && w.includes('24GB'))
        ).toBe(true)
      })

      test('No GPU warnings with 24GB+ VRAM', () => {
        const result = validateStrawberrylemonadeRequirements(32, 24)

        expect(result.warnings).toHaveLength(0)
      })

      test('No GPU warnings with 32GB VRAM (RTX 5090)', () => {
        const result = validateStrawberrylemonadeRequirements(32, 32)

        expect(result.warnings).toHaveLength(0)
      })
    })

    describe('Default parameter handling', () => {
      test('Handles missing VRAM parameter (defaults to 0)', () => {
        const result = validateStrawberrylemonadeRequirements(32)

        expect(result.canRun).toBe(true)
        expect(result.warnings.some((w) => w.includes('CPU-only'))).toBe(true)
      })

      test('Explicitly passing 0 VRAM works', () => {
        const result = validateStrawberrylemonadeRequirements(32, 0)

        expect(result.canRun).toBe(true)
        expect(result.recommended).toBeDefined()
      })
    })

    describe('Edge cases', () => {
      test('Handles exactly minimum RAM (32GB)', () => {
        const result = validateStrawberrylemonadeRequirements(32, 24)

        expect(result.canRun).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      test('Handles RAM just below minimum (31GB)', () => {
        const result = validateStrawberrylemonadeRequirements(31, 24)

        expect(result.canRun).toBe(false)
        expect(result.recommended).toBeNull()
      })

      test('Handles fractional RAM values (32.5GB)', () => {
        const result = validateStrawberrylemonadeRequirements(32.5, 24)

        expect(result.canRun).toBe(true)
      })

      test('Handles very large VRAM (80GB H100)', () => {
        const result = validateStrawberrylemonadeRequirements(128, 80)

        expect(result.canRun).toBe(true)
        expect(result.recommended).toBeDefined()
        expect(result.warnings).toHaveLength(0)
      })
    })
  })

  describe('TypeScript type safety', () => {
    test('Model objects conform to Model type', () => {
      const testModel: Model = strawberrylemonade70bQ5

      // This would fail at compile time if types don't match
      expect(testModel).toBeDefined()
    })

    test('Recommended model can be assigned to Model type', () => {
      const recommended: Model = getRecommendedStrawberrylemonadeModel(32)

      expect(recommended).toBeDefined()
    })

    test('Validation result has correct types', () => {
      const result = validateStrawberrylemonadeRequirements(32, 24)

      expect(typeof result.canRun).toBe('boolean')
      expect(Array.isArray(result.warnings)).toBe(true)
      expect(result.recommended === null || typeof result.recommended === 'object').toBe(true)
    })
  })

  describe('Model descriptions', () => {
    test('All models have non-empty descriptions', () => {
      STRAWBERRYLEMONADE_MODELS.forEach((model) => {
        expect(model.description).toBeDefined()
        expect(model.description.length).toBeGreaterThan(0)
      })
    })

    test('Descriptions mention quantization type', () => {
      expect(strawberrylemonade70bQ4.description).toContain('Q4_K_M')
      expect(strawberrylemonade70bQ5.description).toContain('Q5_K_M')
      expect(strawberrylemonade70bQ6.description).toContain('Q6_K')
      expect(strawberrylemonade70bQ8.description).toContain('Q8_0')
    })

    test('Q5 description mentions RTX 5090 recommendation', () => {
      expect(strawberrylemonade70bQ5.description).toContain('RTX 5090')
    })
  })
})
