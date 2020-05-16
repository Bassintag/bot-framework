import {IController} from './controller';
import {IUpdateManager} from '../update/update-manager';
import {inject, injectable} from 'inversify';
import {IDENTIFIERS} from '../constants/identifiers';
import {IUpdateStatus} from '../update/domain/update-status';
import {IMethodBinder} from './method-binder';

@injectable()
export class UpdateController implements IController {

    constructor(
        @inject(IDENTIFIERS.UPDATE_MANAGER)
        private readonly $updateManager: IUpdateManager,
        @inject(IDENTIFIERS.METHOD_BINDER)
        private readonly $methodBinder: IMethodBinder,
    ) {
    }

    public async checkForUpdate(): Promise<void> {
        return this.$updateManager.checkForUpdate();
    }

    public async install(): Promise<void> {
        return this.$updateManager.install();
    }

    public async getStatus(): Promise<IUpdateStatus> {
        return this.$updateManager.status;
    }

    async init(): Promise<void> {
        this.$methodBinder.registerMethod('updates/check', () => this.checkForUpdate());
        this.$methodBinder.registerMethod('updates/install', () => this.install());
        this.$methodBinder.registerMethod('updates/getStatus', () => this.getStatus());
    }
}
