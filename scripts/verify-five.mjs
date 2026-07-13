import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const evidence = join(root, 'artifacts', 'evidence')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const runs = []

await mkdir(evidence, { recursive: true })

for (let run = 1; run <= 5; run += 1) {
  const startedAt = new Date().toISOString()
  const started = performance.now()
  const { code, output } = await executeVerify(run)
  const durationMs = Math.round(performance.now() - started)
  runs.push({ run, startedAt, durationMs, exitCode: code })
  await writeFile(join(evidence, `verify-run-${run}.log`), output)
  if (code !== 0) break
}

const summary = {
  generatedAt: new Date().toISOString(),
  allPassed: runs.length === 5 && runs.every((run) => run.exitCode === 0),
  runs,
}
await writeFile(join(evidence, 'verify-five-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)

if (!summary.allPassed) process.exitCode = 1

function executeVerify(run) {
  return new Promise((resolve, reject) => {
    let output = `Shortcutype full verification run ${run}/5\n`
    process.stdout.write(`\n=== Full verification ${run}/5 ===\n`)
    const child = spawn(npm, ['run', 'verify'], { cwd: root, env: process.env })
    child.stdout.on('data', (chunk) => { output += chunk; process.stdout.write(chunk) })
    child.stderr.on('data', (chunk) => { output += chunk; process.stderr.write(chunk) })
    child.on('error', reject)
    child.on('exit', (code) => resolve({ code: code ?? 1, output }))
  })
}
