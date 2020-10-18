import { IEntityManager } from '../entity-manager';
import umzug, { Umzug } from 'umzug';
import { IMigration } from './migration';
import { inject, injectable, multiInject } from 'inversify';
import { IDENTIFIERS } from '../constants/identifiers';
import { ILogger } from '../utils/logger';

export interface IMigrationManager {
	up(): Promise<any>;

	down(): Promise<any>;
}

@injectable()
export class MigrationManager implements IMigrationManager {
	private readonly $umzug: Umzug;

	constructor(
		@inject(IDENTIFIERS.ENTITY_MANAGER)
		private readonly $entityManager: IEntityManager,
		@inject(IDENTIFIERS.LOGGER)
		private readonly $logger: ILogger,
		@multiInject(IDENTIFIERS.MIGRATION)
		private readonly $migrations: IMigration[]
	) {
		this.$umzug = new umzug({
			storage: 'sequelize',
			storageOptions: {
				sequelize: $entityManager,
			},
			migrations: $migrations,
		});
	}

	async down(): Promise<any> {
		this.$logger.debug('Migrating down...');
		await this.$umzug.down();
		this.$logger.debug('Done migrating down');
	}

	async up(): Promise<any> {
		this.$logger.debug('Migrating up...');
		await this.$umzug.up();
		this.$logger.debug('Done migrating up');
	}
}
