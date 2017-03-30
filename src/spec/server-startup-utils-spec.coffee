path = require 'path'
_ = require 'lodash'
{fixClasspath, javaCmdOf} = require '../lib/server-startup/server-startup-utils'

describe 'server-startup', ->

   
  describe 'javaCmdOf', ->
    it 'should find java form .ensime', ->
      dotEnsime =
        javaHome: '__javaHome__'
      expect(javaCmdOf(dotEnsime)).toBe path.join('__javaHome__','bin','java')
