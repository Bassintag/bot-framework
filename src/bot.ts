import {inject, injectable, multiInject} from 'inversify';
import {IOnInit} from './utils/on-init';
import {Sequelize} from 'sequelize-typescript';
import {IDENTIFIERS} from './constants/identifiers';
import {ILogger} from './utils/logger';
import {IMigrationManager} from './migrations/migration-manager';

export interface IBot extends IOnInit {

}

@injectable()
export class Bot implements IBot {

    constructor(
        @inject(IDENTIFIERS.LOGGER)
        private readonly $logger: ILogger,
        @inject(IDENTIFIERS.ENTITY_MANAGER)
        private readonly $entityManager: Sequelize,
        @inject(IDENTIFIERS.MIGRATION_MANAGER)
        private readonly $migrationManager: IMigrationManager,
        @multiInject(IDENTIFIERS.BOOTSTRAP)
        private readonly $bootstrap: IOnInit[],
    ) {
    }

    public async init(): Promise<void> {
        this.$logger.info('Initializing bot...');
        this.$logger.info('Initializing entity manager');
        await this.$migrationManager.up();
        this.$logger.info('Initializing controllers');
        await Promise.all(this.$bootstrap.map((c) => c.init()));
        this.$logger.info('Initializing done');
    }

}
