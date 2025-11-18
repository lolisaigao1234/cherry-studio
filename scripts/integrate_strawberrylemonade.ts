/**
 * Strawberrylemonade Model Integration Script
 * Cherry Studio Integration - Phase 0
 *
 * This script integrates the Strawberrylemonade-L3-70B-v1.1 model configurations
 * into Cherry Studio's model registry, adding them to the Ollama provider's
 * available models list.
 *
 * Usage:
 *   ts-node scripts/integrate_strawberrylemonade.ts [--dry-run] [--verbose]
 *
 * @author Cherry Studio Integration Team
 * @version 1.0.0
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * Configuration for the integration process
 */
interface IntegrationConfig {
  dryRun: boolean
  verbose: boolean
  modelsFilePath: string
  backupEnabled: boolean
}

/**
 * Result of the integration process
 */
interface IntegrationResult {
  success: boolean
  modelsAdded: number
  backupPath?: string
  errors: string[]
  warnings: string[]
}

/**
 * Strawberrylemonade Model Integration Manager
 */
class StrawberrylemonadeIntegrator {
  private config: IntegrationConfig

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.config = {
      dryRun: config.dryRun ?? false,
      verbose: config.verbose ?? false,
      modelsFilePath:
        config.modelsFilePath ??
        path.join(
          __dirname,
          '../src/renderer/src/config/models/default.ts'
        ),
      backupEnabled: config.backupEnabled ?? true
    }
  }

  /**
   * Main integration function
   */
  async integrate(): Promise<IntegrationResult> {
    const result: IntegrationResult = {
      success: false,
      modelsAdded: 0,
      errors: [],
      warnings: []
    }

    try {
      this.log('Starting Strawberrylemonade model integration...')

      // Step 1: Validate files exist
      this.log('Step 1: Validating file paths...')
      if (!this.validatePaths()) {
        result.errors.push('File validation failed')
        return result
      }

      // Step 2: Create backup
      if (this.config.backupEnabled && !this.config.dryRun) {
        this.log('Step 2: Creating backup...')
        const backupPath = this.createBackup()
        if (backupPath) {
          result.backupPath = backupPath
          this.log(`  Backup created: ${backupPath}`)
        } else {
          result.warnings.push('Backup creation failed')
        }
      }

      // Step 3: Read current models file
      this.log('Step 3: Reading current models configuration...')
      const modelsContent = fs.readFileSync(this.config.modelsFilePath, 'utf-8')

      // Step 4: Check if already integrated
      if (this.isAlreadyIntegrated(modelsContent)) {
        result.warnings.push('Strawberrylemonade models appear to already be integrated')
        this.log('  Warning: Models may already be integrated')
      }

      // Step 5: Generate integration code
      this.log('Step 4: Generating integration code...')
      const integrationCode = this.generateIntegrationCode()

      // Step 6: Find insertion point and update
      this.log('Step 5: Updating models configuration...')
      const updatedContent = this.insertIntegration(modelsContent, integrationCode)

      // Step 7: Write updated file (unless dry run)
      if (!this.config.dryRun) {
        this.log('Step 6: Writing updated configuration...')
        fs.writeFileSync(this.config.modelsFilePath, updatedContent, 'utf-8')
        this.log('  Configuration file updated successfully')
      } else {
        this.log('Step 6: Skipped (dry run mode)')
        this.log('\nGenerated integration code:')
        this.log('----------------------------------------')
        this.log(integrationCode)
        this.log('----------------------------------------')
      }

      result.success = true
      result.modelsAdded = 4 // Q4, Q5, Q6, Q8

      this.log('\nIntegration completed successfully!')
      this.log(`  Models added: ${result.modelsAdded}`)
      if (result.backupPath) {
        this.log(`  Backup saved: ${result.backupPath}`)
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMsg)
      this.log(`\nError: ${errorMsg}`, true)
      return result
    }
  }

  /**
   * Validate that required files exist
   */
  private validatePaths(): boolean {
    try {
      // Check models file exists
      if (!fs.existsSync(this.config.modelsFilePath)) {
        this.log(`  Error: Models file not found: ${this.config.modelsFilePath}`, true)
        return false
      }

      // Check strawberrylemonade config exists
      const strawberryPath = path.join(
        path.dirname(this.config.modelsFilePath),
        'strawberrylemonade.ts'
      )
      if (!fs.existsSync(strawberryPath)) {
        this.log(`  Error: Strawberrylemonade config not found: ${strawberryPath}`, true)
        return false
      }

      this.log('  All required files found')
      return true
    } catch (error) {
      this.log(`  Error validating paths: ${error}`, true)
      return false
    }
  }

  /**
   * Create backup of current models file
   */
  private createBackup(): string | null {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = `${this.config.modelsFilePath}.backup-${timestamp}`

      fs.copyFileSync(this.config.modelsFilePath, backupPath)

      return backupPath
    } catch (error) {
      this.log(`  Warning: Backup creation failed: ${error}`, true)
      return null
    }
  }

  /**
   * Check if Strawberrylemonade models are already integrated
   */
  private isAlreadyIntegrated(content: string): boolean {
    return (
      content.includes('strawberrylemonade') ||
      content.includes('Strawberrylemonade') ||
      content.includes('from "./strawberrylemonade"')
    )
  }

  /**
   * Generate the integration code to be inserted
   */
  private generateIntegrationCode(): string {
    return `
// Strawberrylemonade-L3-70B-v1.1 Models (Local Ollama Deployment)
import { STRAWBERRYLEMONADE_MODELS } from './strawberrylemonade'
`
  }

  /**
   * Insert integration code into models file
   */
  private insertIntegration(originalContent: string, integrationCode: string): string {
    // Find the import section (look for last import statement)
    const importRegex = /^import.*from.*$/gm
    const imports = originalContent.match(importRegex) || []

    if (imports.length === 0) {
      throw new Error('No import statements found in models file')
    }

    const lastImport = imports[imports.length - 1]
    const lastImportIndex = originalContent.lastIndexOf(lastImport)
    const insertionPoint = lastImportIndex + lastImport.length

    // Insert the import
    const contentWithImport =
      originalContent.slice(0, insertionPoint) +
      integrationCode +
      originalContent.slice(insertionPoint)

    // Now find where to add models to SYSTEM_MODELS.ollama
    // Look for SYSTEM_MODELS export or ollama model array
    const ollamaModelsRegex = /ollama:\s*\[([\s\S]*?)\]/
    const match = contentWithImport.match(ollamaModelsRegex)

    if (!match) {
      throw new Error('Could not find ollama models array in file')
    }

    const ollamaModelsArray = match[1]
    const updatedArray = ollamaModelsArray.trimEnd() + ',\n    ...STRAWBERRYLEMONADE_MODELS'

    const finalContent = contentWithImport.replace(
      ollamaModelsRegex,
      `ollama: [${updatedArray}]`
    )

    return finalContent
  }

  /**
   * Log message to console
   */
  private log(message: string, isError: boolean = false): void {
    if (this.config.verbose || isError) {
      if (isError) {
        console.error(message)
      } else {
        console.log(message)
      }
    }
  }

  /**
   * Validate the integration was successful
   */
  async validate(): Promise<boolean> {
    try {
      const content = fs.readFileSync(this.config.modelsFilePath, 'utf-8')

      // Check for import
      if (!content.includes('from \'./strawberrylemonade\'')) {
        this.log('Validation failed: Import not found', true)
        return false
      }

      // Check for spread in ollama models
      if (!content.includes('...STRAWBERRYLEMONADE_MODELS')) {
        this.log('Validation failed: Models not added to ollama array', true)
        return false
      }

      this.log('Validation passed: Integration successful')
      return true
    } catch (error) {
      this.log(`Validation error: ${error}`, true)
      return false
    }
  }

  /**
   * Rollback integration (restore from backup)
   */
  async rollback(backupPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(backupPath)) {
        this.log(`Rollback failed: Backup not found: ${backupPath}`, true)
        return false
      }

      fs.copyFileSync(backupPath, this.config.modelsFilePath)
      this.log(`Rollback successful: Restored from ${backupPath}`)
      return true
    } catch (error) {
      this.log(`Rollback failed: ${error}`, true)
      return false
    }
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2)

  const config: Partial<IntegrationConfig> = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    backupEnabled: !args.includes('--no-backup')
  }

  console.log('=' .repeat(70))
  console.log('Strawberrylemonade-L3-70B-v1.1 Integration Script')
  console.log('Cherry Studio - Phase 0')
  console.log('=' .repeat(70))
  console.log()

  if (config.dryRun) {
    console.log('Running in DRY RUN mode (no files will be modified)')
    console.log()
  }

  const integrator = new StrawberrylemonadeIntegrator(config)
  const result = await integrator.integrate()

  console.log()
  console.log('=' .repeat(70))

  if (result.success) {
    console.log('✅ INTEGRATION SUCCESSFUL')
    console.log(`   Models added: ${result.modelsAdded}`)

    if (result.backupPath) {
      console.log(`   Backup saved: ${result.backupPath}`)
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      result.warnings.forEach((warning) => console.log(`   - ${warning}`))
    }

    if (!config.dryRun) {
      console.log('\nNext steps:')
      console.log('  1. Review the changes in src/renderer/src/config/models/default.ts')
      console.log('  2. Run: yarn build:check (to validate)')
      console.log('  3. Restart Cherry Studio')
      console.log('  4. Verify models appear in Ollama provider settings')
    }
  } else {
    console.log('❌ INTEGRATION FAILED')

    if (result.errors.length > 0) {
      console.log('\nErrors:')
      result.errors.forEach((error) => console.log(`   - ${error}`))
    }

    process.exit(1)
  }

  console.log('=' .repeat(70))
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { StrawberrylemonadeIntegrator, IntegrationConfig, IntegrationResult }
