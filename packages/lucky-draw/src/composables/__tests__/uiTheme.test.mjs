import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))
const srcDir = join(testDir, '..', '..')
const legacyImagePath = join(srcDir, 'assets', 'duan' + 'wu-' + 'river' + 'bank.png')
const legacyTerms = [
  'duan' + 'wu',
  'zong' + 'zi',
  'Fes' + 'tival' + 'Background',
  '端' + '午',
  '粽' + '子',
  '游' + '园',
  '龙' + '舟',
  '挑战' + '得分',
]

const collectSourceFiles = (dir) => {
  const entries = readdirSync(dir)
  const files = []

  for (const entry of entries) {
    const path = join(dir, entry)
    const relativePath = relative(srcDir, path)

    if (relativePath.includes('__tests__')) {
      continue
    }

    const stats = statSync(path)

    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(path))
      continue
    }

    if (/\.(ts|vue|css)$/.test(entry)) {
      files.push(path)
    }
  }

  return files
}

test('lucky draw UI no longer references legacy festival theme assets or copy', () => {
  assert.equal(existsSync(legacyImagePath), false, 'legacy background image should be removed from the repository')

  for (const file of collectSourceFiles(srcDir)) {
    const source = readFileSync(file, 'utf8')

    for (const term of legacyTerms) {
      assert.equal(source.includes(term), false, `${relative(srcDir, file)} still contains legacy theme term: ${term}`)
    }
  }
})
