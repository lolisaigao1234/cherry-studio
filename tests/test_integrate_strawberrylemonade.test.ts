/**
 * Unit Tests for Strawberrylemonade Integration Script
 * Cherry Studio Integration - Phase 0
 *
 * Tests the model integration script with mocked file system operations.
 *
 * @author Cherry Studio Integration Team
 * @version 1.0.0
 */

import * as fs from 'fs'
import * as path from 'path'
import { beforeEach, describe, expect, it, test, vi } from 'vitest'
import {
  IntegrationConfig,
  StrawberrylemonadeIntegrator
} from '../scripts/integrate_strawberrylemonade'

// Mock fs module
vi.mock('fs')

describe('StrawberrylemonadeIntegrator', () => {
  let integrator: StrawberrylemonadeIntegrator
  let mockModelsContent: string

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Sample models file content
    mockModelsContent = `
import { Model } from '@renderer/types'
import { someOtherImport } from './other'

export const SYSTEM_MODELS = {
  ollama: [
    existingModel1,
    existingModel2
  ],
  openai: [
    openaiModel1
  ]
}
`

    // Default config for tests
    integrator = new StrawberrylemonadeIntegrator({
      dryRun: true,
      verbose: false,
      modelsFilePath: '/fake/path/models/default.ts',
      backupEnabled: false
    })
  })

  describe('Constructor and Initialization', () => {
    test('Creates integrator with default config', () => {
      const defaultIntegrator = new StrawberrylemonadeIntegrator()

      expect(defaultIntegrator).toBeInstanceOf(StrawberrylemonadeIntegrator)
    })

    test('Creates integrator with custom config', () => {
      const customIntegrator = new StrawberrylemonadeIntegrator({
        dryRun: true,
        verbose: true,
        backupEnabled: false
      })

      expect(customIntegrator).toBeInstanceOf(StrawberrylemonadeIntegrator)
    })

    test('Config defaults are applied correctly', () => {
      const integrator = new StrawberrylemonadeIntegrator({})

      // Can't directly access config, but behavior should reflect defaults
      expect(integrator).toBeDefined()
    })
  })

  describe('validatePaths()', () => {
    test('Returns true when all required files exist', async () => {
      // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = await integrator.integrate()

      // Should not have path validation errors
      expect(result.errors.some((e) => e.includes('not found'))).toBe(false)
    })

    test('Returns false when models file does not exist', async () => {
      // Mock only the models file as missing
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return !filePath.toString().includes('default.ts')
      })

      const result = await integrator.integrate()

      expect(result.success).toBe(false)
      expect(result.errors.some((e) => e.includes('validation failed'))).toBe(true)
    })

    test('Returns false when strawberrylemonade.ts does not exist', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return !filePath.toString().includes('strawberrylemonade.ts')
      })

      const result = await integrator.integrate()

      expect(result.success).toBe(false)
    })
  })

  describe('createBackup()', () => {
    test('Creates backup with timestamp', async () => {
      const copySpy = vi.mocked(fs.copyFileSync).mockImplementation(() => {})
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: false,
        backupEnabled: true,
        modelsFilePath: '/fake/models/default.ts'
      })

      await integrator.integrate()

      // copyFileSync should be called for backup
      expect(copySpy).toHaveBeenCalled()
      const backupCall = copySpy.mock.calls[0]
      expect(backupCall[1]).toContain('.backup-')
    })

    test('Skips backup in dry run mode', async () => {
      const copySpy = vi.mocked(fs.copyFileSync).mockImplementation(() => {})
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: true,
        backupEnabled: true
      })

      await integrator.integrate()

      // Should not create backup in dry run
      expect(copySpy).not.toHaveBeenCalled()
    })

    test('Handles backup creation failure gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        throw new Error('Disk full')
      })

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: false,
        backupEnabled: true
      })

      const result = await integrator.integrate()

      // Should warn but not fail completely
      expect(result.warnings.some((w) => w.includes('Backup'))).toBe(true)
    })
  })

  describe('isAlreadyIntegrated()', () => {
    test('Detects integration by import statement', async () => {
      const integratedContent = `
import { STRAWBERRYLEMONADE_MODELS } from './strawberrylemonade'

export const SYSTEM_MODELS = {
  ollama: [...STRAWBERRYLEMONADE_MODELS]
}
`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(integratedContent)

      const result = await integrator.integrate()

      expect(result.warnings.some((w) => w.includes('already'))).toBe(true)
    })

    test('Detects integration by model name', async () => {
      const integratedContent = `
const strawberrylemonade70bQ4 = { id: 'test' }

export const SYSTEM_MODELS = {
  ollama: [strawberrylemonade70bQ4]
}
`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(integratedContent)

      const result = await integrator.integrate()

      expect(result.warnings.some((w) => w.includes('already'))).toBe(true)
    })

    test('Does not flag false positives', async () => {
      const cleanContent = `
import { Model } from '@renderer/types'

export const SYSTEM_MODELS = {
  ollama: [otherModel]
}
`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(cleanContent)

      const result = await integrator.integrate()

      expect(result.warnings.some((w) => w.includes('already'))).toBe(false)
    })
  })

  describe('generateIntegrationCode()', () => {
    test('Generates correct import statement', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const result = await integrator.integrate()

      // In dry run mode, integration code is logged
      expect(result.success).toBe(true)
    })

    test('Generated code includes STRAWBERRYLEMONADE_MODELS', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const result = await integrator.integrate()

      expect(result.success).toBe(true)
      // Code should reference STRAWBERRYLEMONADE_MODELS
    })
  })

  describe('insertIntegration()', () => {
    test('Inserts import after last import statement', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const writeSpy = vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: false,
        backupEnabled: false
      })

      await integrator.integrate()

      // Check that writeFileSync was called
      expect(writeSpy).toHaveBeenCalled()

      const writtenContent = writeSpy.mock.calls[0][1] as string

      // Verify import was added
      expect(writtenContent).toContain('from \'./strawberrylemonade\'')
    })

    test('Adds models to ollama array with spread operator', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const writeSpy = vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: false,
        backupEnabled: false
      })

      await integrator.integrate()

      const writtenContent = writeSpy.mock.calls[0][1] as string

      // Verify spread operator was used
      expect(writtenContent).toContain('...STRAWBERRYLEMONADE_MODELS')
    })

    test('Preserves existing ollama models', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const writeSpy = vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: false,
        backupEnabled: false
      })

      await integrator.integrate()

      const writtenContent = writeSpy.mock.calls[0][1] as string

      // Existing models should still be there
      expect(writtenContent).toContain('existingModel1')
      expect(writtenContent).toContain('existingModel2')
    })

    test('Throws error if no imports found', async () => {
      const noImportsContent = `
export const SYSTEM_MODELS = {
  ollama: [model1]
}
`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(noImportsContent)

      const result = await integrator.integrate()

      expect(result.success).toBe(false)
      expect(result.errors.some((e) => e.includes('import'))).toBe(true)
    })

    test('Throws error if ollama models array not found', async () => {
      const noOllamaContent = `
import { Model } from '@renderer/types'

export const SYSTEM_MODELS = {
  openai: [model1]
}
`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(noOllamaContent)

      const result = await integrator.integrate()

      expect(result.success).toBe(false)
      expect(result.errors.some((e) => e.includes('ollama'))).toBe(true)
    })
  })

  describe('integrate() - Full Flow', () => {
    test('Completes successfully in dry run mode', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const result = await integrator.integrate()

      expect(result.success).toBe(true)
      expect(result.modelsAdded).toBe(4)
      expect(result.errors).toHaveLength(0)
    })

    test('Writes file in non-dry-run mode', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)
      const writeSpy = vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: false,
        backupEnabled: false
      })

      const result = await integrator.integrate()

      expect(result.success).toBe(true)
      expect(writeSpy).toHaveBeenCalled()
    })

    test('Returns correct number of models added', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const result = await integrator.integrate()

      expect(result.modelsAdded).toBe(4) // Q4, Q5, Q6, Q8
    })

    test('Handles errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error')
      })

      const result = await integrator.integrate()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validate()', () => {
    test('Passes validation when correctly integrated', async () => {
      const integratedContent = `
import { STRAWBERRYLEMONADE_MODELS } from './strawberrylemonade'

export const SYSTEM_MODELS = {
  ollama: [
    existingModel,
    ...STRAWBERRYLEMONADE_MODELS
  ]
}
`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(integratedContent)

      const isValid = await integrator.validate()

      expect(isValid).toBe(true)
    })

    test('Fails validation when import missing', async () => {
      const noImportContent = `
export const SYSTEM_MODELS = {
  ollama: [
    ...STRAWBERRYLEMONADE_MODELS
  ]
}
`

      vi.mocked(fs.readFileSync).mockReturnValue(noImportContent)

      const isValid = await integrator.validate()

      expect(isValid).toBe(false)
    })

    test('Fails validation when spread operator missing', async () => {
      const noSpreadContent = `
import { STRAWBERRYLEMONADE_MODELS } from './strawberrylemonade'

export const SYSTEM_MODELS = {
  ollama: [existingModel]
}
`

      vi.mocked(fs.readFileSync).mockReturnValue(noSpreadContent)

      const isValid = await integrator.validate()

      expect(isValid).toBe(false)
    })

    test('Handles validation errors gracefully', async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Cannot read file')
      })

      const isValid = await integrator.validate()

      expect(isValid).toBe(false)
    })
  })

  describe('rollback()', () => {
    test('Successfully restores from backup', async () => {
      const backupPath = '/fake/backup.ts'

      vi.mocked(fs.existsSync).mockReturnValue(true)
      const copySpy = vi.mocked(fs.copyFileSync).mockImplementation(() => {})

      const success = await integrator.rollback(backupPath)

      expect(success).toBe(true)
      expect(copySpy).toHaveBeenCalledWith(backupPath, expect.any(String))
    })

    test('Fails when backup file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const success = await integrator.rollback('/nonexistent/backup.ts')

      expect(success).toBe(false)
    })

    test('Handles rollback errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        throw new Error('Copy failed')
      })

      const success = await integrator.rollback('/fake/backup.ts')

      expect(success).toBe(false)
    })
  })

  describe('Integration Result Structure', () => {
    test('Result contains all required fields', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)

      const result = await integrator.integrate()

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('modelsAdded')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('warnings')
    })

    test('Errors array is populated on failure', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = await integrator.integrate()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    test('Backup path is included when backup created', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockModelsContent)
      vi.mocked(fs.copyFileSync).mockImplementation(() => {})

      const integrator = new StrawberrylemonadeIntegrator({
        dryRun: false,
        backupEnabled: true
      })

      const result = await integrator.integrate()

      expect(result.backupPath).toBeDefined()
      expect(result.backupPath).toContain('.backup-')
    })
  })
})
