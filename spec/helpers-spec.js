/* @flow */

import * as Helpers from '../src/helpers'

describe('Helpers', function() {
  describe('mergeEnv', function() {
    it('returns env as is if not windows', function() {
      expect(Helpers.mergeEnv({ PATH: 'a;b' }, { PATH: 'c' })).toEqual({ PATH: 'c' })
      expect(Helpers.mergeEnv({ PATH: 'a;b' }, { Path: 'c' })).toEqual({ PATH: 'a;b', Path: 'c' })
      expect(Helpers.mergeEnv({ PATH: 'a;b', Path: 'c' }, { PATH: 'd' })).toEqual({ PATH: 'd', Path: 'c' })
    })
    it('merges env on windows', function() {
      const oldPlatform = process.platform
      let platform = 'win32'
      // $FlowIgnore: Flow is dumb?
      Object.defineProperty(process, 'platform', {
        get() {
          return platform
        },
      })
      expect(Helpers.mergeEnv({ PATH: 'a;b' }, { PATH: 'c' })).toEqual({ PATH: 'a;b;c' })
      expect(Helpers.mergeEnv({ PATH: 'a;b' }, { Path: 'c' })).toEqual({ PATH: 'a;b;c' })
      expect(Helpers.mergeEnv({ PATH: 'a;b', Path: 'c' }, { PATH: 'd' })).toEqual({ PATH: 'a;b;c;d' })
      expect(Helpers.mergeEnv({ PATH: 'a;b', Path: 'c' }, { })).toEqual({ PATH: 'a;b;c' })
      platform = oldPlatform
    })
  })
  describe('mergePath', function() {
    it('merges multiple paths', function() {
      expect(Helpers.mergePath('a;b', 'c;d')).toBe('a;b;c;d')
    })
    it('does not include duplicates', function() {
      expect(Helpers.mergePath('a;b', 'a;c')).toBe('a;b;c')
    })
    it('does not include empty stuff', function() {
      expect(Helpers.mergePath('', '')).toBe('')
      expect(Helpers.mergePath('a;', '')).toBe('a')
      expect(Helpers.mergePath('a;', ';c')).toBe('a;c')
    })
    it('trims the stuff included', function() {
      expect(Helpers.mergePath('; a ; b ; c ; d ;', 'g ; e')).toBe('a;b;c;d;g;e')
    })
  })
})