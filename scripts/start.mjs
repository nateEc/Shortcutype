import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

if (!existsSync(join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite'))) {
  await run(['ci', '--no-audit', '--no-fund'])
}

await run(['run', 'dev', '--', '--host', process.env.HOST ?? '127.0.0.1'])

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, args, { cwd: root, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) reject(new Error(`npm stopped by ${signal}`))
      else if (code === 0) resolve()
      else reject(new Error(`npm ${args.join(' ')} exited with ${code}`))
    })
  })
}
