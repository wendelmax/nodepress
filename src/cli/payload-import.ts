import { readFile, writeFile } from 'node:fs/promises'
import { contentTypeRegistry, ContentService, PrismaContentRepository } from '@/modules/content'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import {
  ContentServicePayloadWriter,
  JsonPayloadSource,
  PayloadImporter,
  PrismaPayloadImportStore,
  type PayloadImportMapping,
  type PayloadImportOptions,
  type PayloadImportReport,
} from '@/integrations/payload'

export async function runPayloadImport(argv: string[] = process.argv.slice(2)): Promise<PayloadImportReport> {
  const args = parseArgs(argv)
  if (!args.file) throw new Error('--file is required')
  if (!args.mapping) throw new Error('--mapping is required')

  await ensureActivePluginsLoaded()
  const mappings = await readMappings(args.mapping)
  const source = new JsonPayloadSource(args.file)
  const importer = new PayloadImporter(
    new ContentServicePayloadWriter(new ContentService(contentTypeRegistry, new PrismaContentRepository())),
    new PrismaPayloadImportStore(),
  )
  const options: PayloadImportOptions = {
    mappings,
    batchSize: args.batchSize,
    dryRun: args.dryRun,
    resume: args.resume,
  }
  const report = await importer.import(await source.read(), options)
  const serialized = JSON.stringify(report, null, 2)
  if (args.report) await writeFile(args.report, `${serialized}\n`, 'utf8')
  else process.stdout.write(`${serialized}\n`)
  return report
}

async function readMappings(filePath: string): Promise<PayloadImportMapping[]> {
  const value = JSON.parse(await readFile(filePath, 'utf8')) as PayloadImportMapping[] | { mappings?: PayloadImportMapping[] }
  const mappings = Array.isArray(value) ? value : value.mappings
  if (!mappings?.length) throw new Error('Mapping file must contain at least one mapping')
  return mappings
}

function parseArgs(argv: string[]) {
  const args: { file?: string; mapping?: string; report?: string; batchSize?: number; dryRun: boolean; resume: boolean } = { dryRun: false, resume: true }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') args.dryRun = true
    else if (argument === '--resume') args.resume = true
    else if (argument === '--no-resume') args.resume = false
    else if (argument === '--file') args.file = argv[++index]
    else if (argument === '--mapping') args.mapping = argv[++index]
    else if (argument === '--report') args.report = argv[++index]
    else if (argument === '--batch-size') {
      const batchSize = Number(argv[++index])
      if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('--batch-size must be a positive integer')
      args.batchSize = batchSize
    } else if (argument === '--help') throw new Error('Usage: npm run payload:import -- --file export.json --mapping mapping.json [--dry-run] [--batch-size 100] [--resume] [--report report.json]')
    else throw new Error(`Unknown argument: ${argument}`)
  }
  return args
}

if (process.argv[1]?.endsWith('payload-import.ts')) {
  runPayloadImport().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Payload import failed'}\n`)
    process.exitCode = 1
  })
}
