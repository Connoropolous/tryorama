const sinon = require('sinon')
const test = require('tape')
const TOML = require('@iarna/toml')

import { Orchestrator } from '../src/orchestrator'
import * as T from '../src/types'
import * as C from '../src/config';
import { genConfigArgs } from './common';
import { totalmem } from 'os';

const { configPlain, configSugared } = (() => {
  const dna = C.dna('path/to/dna.json', 'dna-id', { uuid: 'uuid' })
  const common = {
    name: 'conducty mcconductorface',
    bridges: [C.bridge('b', 'alice', 'bob')],
    dpki: C.dpki('alice', { well: 'hello' }),
  }
  const instancesSugared = {
    alice: dna,
    bob: dna,
  }
  const instancesDesugared: Array<T.InstanceConfig> = [
    {
      id: 'alice',
      agent: {
        id: 'alice',
        name: 'alice',
      },
      dna: {
        id: 'dna-id',
        path: 'path/to/dna.json',
        uuid: 'uuid'
      }
    },
    {
      id: 'bob',
      agent: {
        id: 'bob',
        name: 'bob',
      },
      dna: {
        id: 'dna-id',
        path: 'path/to/dna.json',
        uuid: 'uuid'
      }
    }
  ]
  const configSugared = Object.assign({}, common, { instances: instancesSugared })
  const configPlain = Object.assign({}, common, { instances: instancesDesugared })
  return { configPlain, configSugared }
})()

test('Sugared config', async t => {
  t.deepEqual(C.desugarConfig(configSugared), configPlain)
  t.end()
})

test('genInstanceConfig', async t => {
  const stubGetDnaHash = sinon.stub(C, 'getDnaHash').resolves('fakehash')
  const { instances, interfaces } = await C.genInstanceConfig(configPlain, await genConfigArgs())
  t.equal(instances.length, 2)
  t.equal(interfaces.length, 2)
  t.equal(interfaces[0].instances.length, 0)
  t.equal(interfaces[1].instances.length, 2)
  t.end()
  stubGetDnaHash.restore()
})

test('genBridgeConfig', async t => {
  const { bridges } = await C.genBridgeConfig(configPlain)
  t.deepEqual(bridges, [{ handle: 'b', caller_id: 'alice', callee_id: 'bob' }])
  t.end()
})

test('genDpkiConfig', async t => {
  const { dpki } = await C.genDpkiConfig(configPlain)
  t.deepEqual(dpki, { instance_id: 'alice', init_params: '{"well":"hello"}' })
  t.end()
})

test('genSignalConfig', async t => {
  const { signals } = await C.genSignalConfig(configPlain)
  t.ok('trace' in signals)
  t.ok('consistency' in signals)
  t.equal(signals.consistency, true)
  t.end()
})

test('genLoggingConfig', async t => {
  const loggerVerbose = await C.genLoggingConfig(true)
  const loggerQuiet = await C.genLoggingConfig(false)

  const expectedVerbose = TOML.parse(`
[logger]
type = "debug"
state_dump = false
[[logger.rules.rules]]
exclude = false
pattern = "^debug"
  `)

  const expectedQuiet = TOML.parse(`
[logger]
type = "debug"
state_dump = false
[[logger.rules.rules]]
exclude = true
pattern = "^debug"
  `)

  t.deepEqual(loggerVerbose, expectedVerbose)
  t.deepEqual(loggerQuiet, expectedQuiet)
  t.end()
})