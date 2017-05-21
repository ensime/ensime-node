import 'lodash'
import * as path from 'path'
import { javaCmdOf } from '../lib/server-startup/server-startup-utils'
import { DotEnsime } from '../lib/types'

describe('server-startup', () => {
   describe('javaCmdOf', () => {
    it('should find java form .ensime', () => {
      const dotEnsime = { javaHome: '__javaHome__' } as DotEnsime
      expect(javaCmdOf(dotEnsime)).toBe(path.join('__javaHome__', 'bin', 'java'))
    })
  })
})
