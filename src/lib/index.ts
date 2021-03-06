export {InstanceManager, EnsimeInstance, makeInstanceFromPath, makeInstanceFromRef} from './instance'

export {DotEnsime, ServerStarter, pid, serverProtocol, ProxySettings} from './types'

export import formatting = require('./formatting')
export import dotEnsimeUtils = require('./dotensime-utils')
export import fileUtils = require('./file-utils')
import * as ensimeServerStartup from './server-startup'
export const startServerFromAssemblyJar = ensimeServerStartup.startServerFromAssemblyJar
export const startServerFromDotEnsimeCP = ensimeServerStartup.startServerFromDotEnsimeCP

export {default as clientStarterFromServerStarter} from './ensime-client-startup'
