/* @flow */

import Path from 'path'
import invariant from 'assert'
import arrayUnique from 'lodash.uniq'
import { async as getEnv } from 'consistent-env'
import { getPathAsync } from 'sb-npm-path'
import type { OptionsAccepted, Options } from './types'

const PATH_SEPARATOR = process.platform === 'win32' ? ';' : ':'

export function validate(filePath: string, parameters: Array<string>, givenOptionsAccepted: OptionsAccepted): Options {
  // NOTE: We need to specify type of this to object to supress some warnings that rise from the merge (Flow, duh)
  const defaultOptions: Object = {}
  const options: Options = Object.assign(defaultOptions, givenOptionsAccepted)

  invariant(typeof filePath === 'string' && filePath, 'filePath must be a string')
  invariant(Array.isArray(parameters), 'parameters must be an array')

  invariant(typeof options === 'object' && options, 'options must be an object')
  if (options.stream) {
    const stream = options.stream
    invariant(stream === 'both' || stream === 'stdout' || stream === 'stderr',
      'options.stream should be stdout|stderr|both')
  } else options.stream = 'stdout'
  if (options.timeout) {
    invariant(typeof options.timeout === 'number', 'options.timeout must be a number')
  } else options.timeout = Infinity
  if (options.env) {
    invariant(typeof options.env === 'object', 'options.env must be an object')
  } else options.env = {}
  if (options.stdin) {
    invariant(typeof options.stdin === 'string', 'options.stdin must be an object')
  } else options.stdin = null
  if (typeof options.throwOnStdErr !== 'undefined') {
    invariant(typeof options.throwOnStdErr === 'boolean', 'options.throwOnStdErr must be a boolean')
  } else options.throwOnStdErr = true
  if (typeof options.local !== 'undefined') {
    invariant(typeof options.local === 'object', 'options.local must be an object')
    invariant(typeof options.local.directory === 'string', 'options.local.directory must be a string')
    if (typeof options.local.prepend !== 'undefined') {
      invariant(typeof options.local.prepend === 'boolean', 'options.local.prepend must be a boolean')
    } else options.local.prepend = false
  }
  if (typeof options.allowEmptyStderr !== 'undefined') {
    invariant(typeof options.allowEmptyStderr === 'boolean', 'options.throwWhenEmptyStderr must be a boolean')
  } else options.allowEmptyStderr = false
  if (typeof options.ignoreExitCode !== 'undefined') {
    invariant(typeof options.ignoreExitCode === 'boolean', 'options.ignoreExitCode must be a boolean')
  } else options.ignoreExitCode = false

  return options
}

export function mergePath(a: string, b: string): string {
  return arrayUnique(a.split(';').concat(b.split(';')).map(i => i.trim()).filter(i => i)).join(';')
}

export function mergeEnv(envA: Object, envB: Object): Object {
  if (process.platform !== 'win32') {
    return Object.assign(envA, envB)
  }

  // NOTE: Merge PATH and Path on windows
  const mergedEnv = { PATH: '' }
  for (const key in envA) {
    if (key.toUpperCase() !== 'PATH') {
      mergedEnv[key] = envA[key]
      continue
    }
    mergedEnv.PATH = mergePath(mergedEnv.PATH, envA[key])
  }
  for (const key in envB) {
    if (key.toUpperCase() !== 'PATH') {
      mergedEnv[key] = envB[key]
      continue
    }
    mergedEnv.PATH = mergePath(mergedEnv.PATH, envB[key])
  }
  return mergedEnv
}

export async function getSpawnOptions(options: Options): Promise<Object> {
  const spawnOptions = Object.assign({}, options, {
    env: mergeEnv(await getEnv(), options.env),
  })
  let npmPath
  const local = options.local
  if (local) {
    npmPath = await getPathAsync(local.directory)
  }
  if (local && npmPath) {
    for (const key in spawnOptions.env) {
      if ({}.hasOwnProperty.call(spawnOptions.env, key) && key === 'PATH') {
        const value = spawnOptions.env[key]
        spawnOptions.env[key] = local.prepend ? npmPath + PATH_SEPARATOR + value : value + PATH_SEPARATOR + npmPath
        break
      }
    }
  }
  delete spawnOptions.timeout
  if (spawnOptions.env.OS) {
    spawnOptions.env.OS = undefined
  }
  if (process.versions.electron) {
    spawnOptions.env.ELECTRON_RUN_AS_NODE = '1'
    spawnOptions.env.ATOM_SHELL_INTERNAL_RUN_AS_NODE = '1'
    spawnOptions.env.ELECTRON_NO_ATTACH_CONSOLE = '1'
  }
  return spawnOptions
}

export function escape(item: any): string {
  return `"${String(item).replace(/"/g, '\\"')}"`
}

export function shouldNormalizeForWindows(filePath: string, options: Options): boolean {
  const baseFilePath = Path.basename(filePath)
  return process.platform === 'win32' && !options.shell && baseFilePath !== 'cmd.exe' && baseFilePath !== 'cmd'
}

export function getENOENTError(filePath: string, parameters: Array<string>): Object {
  const error: Object = new Error(`spawn ${filePath} ENOENT`)
  error.code = 'ENOENT'
  error.errno = 'ENOENT'
  error.syscall = `spawn ${filePath}`
  error.path = filePath
  error.spawnargs = parameters
  return error
}
