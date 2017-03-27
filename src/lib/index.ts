export {InstanceManager, EnsimeInstance, makeInstanceOf} from './instance'

export {DotEnsime, ServerStarter, pid, serverProtocol, ProxySettings} from './types'

export import formatting = require('./formatting')
export import dotEnsimeUtils = require('./dotensime-utils')
export import fileUtils = require('./file-utils')
import * as ensimeServerStartup from './server-startup'
export const startServerFromAssemblyJar = ensimeServerStartup.startServerFromAssemblyJar
export const startServerFromFile = ensimeServerStartup.startServerFromFile

export {default as clientStarterFromServerStarter} from './ensime-client-startup'
