'use strict'

/* @flow */

import { spawn } from 'child_process'
import extify from 'extify'
import { mergeAllPaths, mergeAllPathExts, getSpawnOptions, validate } from './helpers'
import type { Exec$Options, Exec$Result } from './types'

async function exec(
  filePath: string,
  parameters: Array<string> = [],
  options: Exec$Options = {}
): Promise<Exec$Result> {
  validate(filePath, parameters, options)
  const spawnOptions = await getSpawnOptions(options)
  if (process.platform === 'win32') {
    filePath = await extify(filePath, mergeAllPaths(spawnOptions.env), mergeAllPathExts(spawnOptions.env))
  }

  return await new Promise(function(resolve, reject) {
    const spawnedProcess = spawn(filePath, parameters, spawnOptions)
    const data = { stdout: [], stderr: [] }
    let timeout

    if (spawnedProcess.stdout) {
      spawnedProcess.stdout.on('data', function(chunk) {
        data.stdout.push(chunk)
      })
    }
    if (spawnedProcess.stderr) {
      spawnedProcess.stderr.on('data', function(chunk) {
        data.stderr.push(chunk)
      })
    }
    spawnedProcess.on('error', function(error) {
      reject(error)
    })
    spawnedProcess.on('close', function() {
      clearTimeout(timeout)
      if (options.stream === 'stdout') {
        if (data.stderr.length && options.throwOnStdErr) {
          reject(new Error(data.stderr.join('').trim()))
        } else {
          resolve(data.stdout.join('').trim())
        }
      } else if (options.stream === 'stderr') {
        resolve(data.stderr.join('').trim())
      } else {
        resolve({ stdout: data.stdout.join('').trim(), stderr: data.stderr.join('').trim() })
      }
    })

    if (spawnedProcess.stdin) {
      if (options.stdin) {
        try {
          spawnedProcess.stdin.write(options.stdin)
        } catch (_) { /* No Op */ }
      }
      try {
        spawnedProcess.stdin.end()
      } catch (_) { /* No Op */ }
    }

    if (options.timeout !== Infinity) {
      timeout = setTimeout(function() {
        try {
          spawnedProcess.kill()
        } catch (_) { /* No Op */ }
        reject(new Error('Process execution timed out'))
      }, options.timeout)
    }
  })
}

function execNode(filePath: string, parameters: Array<string> = [], options: Exec$Options = {}): Promise<Exec$Result> {
  validate(filePath, parameters, options)
  return exec(process.execPath, [filePath].concat(parameters), options)
}

module.exports = { exec, execNode }
