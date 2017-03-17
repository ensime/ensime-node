import { DotEnsime } from '../types';
import { EnsimeInstance } from './instance';
import * as _  from 'lodash';
import 'path';
/**
 * Takes care of mapping project roots to Ensime clients for multiple Ensime project support under same Atom window
 * This might be supported in vscode too, but currently isn't
 * # TODO: Should use sourdeDirs of .ensime to do mapping of files -> ensime instance
 */
export class InstanceManager<T> {

    private instances: EnsimeInstance<T>[];

    constructor() {
        this.instances = [];
    }

    public registerInstance(instance: EnsimeInstance<T>) {
        this.instances.push(instance);
    }

    public stopInstance(dotEnsime: DotEnsime) {
        for (const instance of this.instances) {
            if (instance.rootDir === dotEnsime.rootDir) {
                instance.destroy();
                this.instances = _.without(this.instances, instance);
            }
        }
    }

    // optional running ensime client of scala source path O(n)
    public instanceOfFile(path: string) {
        return _.find(this.instances, (instance) =>
            _.startsWith(path, instance.dotEnsime.cacheDir) || instance.isSourceOf(path)
        );
    }

    public destroyAll() {
        _.forEach(this.instances, (instance) => instance.destroy());
    }

    public firstInstance() {
        return this.instances[0];
    }

    public isStarted(dotEnsimePath: string) {
        return _.some(this.instances, (instance) => instance.dotEnsime.dotEnsimePath === dotEnsimePath);
    }
}
