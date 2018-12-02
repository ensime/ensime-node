import * as _ from 'lodash'
import 'path'
import { DotEnsime } from '../types'
import { EnsimeInstance, UI } from './instance'
/**
 * Takes care of mapping project roots to Ensime clients for multiple Ensime project support under same Atom window
 * This might be supported in vscode too, but currently isn't
 * # TODO: Should use sourdeDirs of .ensime to do mapping of files -> ensime instance
 */
export class InstanceManager<T extends UI> {
    private instances: Array<EnsimeInstance<T>> = []

    public registerInstance(instance: EnsimeInstance<T>): void {
        this.instances.push(instance)
    }

    public stopInstance(dotEnsime: DotEnsime): void {
        for (const instance of this.instances) {
            if (instance.rootDir === dotEnsime.rootDir) {
                instance.destroy()
                this.instances = _.without(this.instances, instance)
            }
        }
    }

    // optional running ensime client of scala source path O(n)
    public instanceOfFile(path: string): EnsimeInstance<T> | undefined {
        return this.instances.find(instance => _.startsWith(path, instance.dotEnsime.cacheDir) || instance.isSourceOf(path))
    }

    public destroyAll(): void {
        _.forEach(this.instances, instance => instance.destroy())
    }

    public firstInstance(): EnsimeInstance<T> | undefined {
        return this.instances[0]
    }

    public isStarted(dotEnsimePath: string): boolean {
        return _.some(this.instances, instance => instance.dotEnsime.dotEnsimePath === dotEnsimePath)
    }
}
