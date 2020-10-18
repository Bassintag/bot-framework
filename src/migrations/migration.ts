import * as umzug from 'umzug';
import { IEntityManager } from '../entity-manager';
import { inject, injectable } from 'inversify';
import { IDENTIFIERS } from '../constants/identifiers';
import { QueryInterface } from 'sequelize';

export interface IMigration extends umzug.Migration {}

@injectable()
export abstract class Migration implements IMigration {
	get file(): string {
		return this.$key;
	}

	get queryInterface(): QueryInterface {
		return this.entityManager.getQueryInterface();
	}

	@inject(IDENTIFIERS.ENTITY_MANAGER)
	readonly entityManager!: IEntityManager;

	protected constructor(private readonly $key: string) {}

	async migration(): Promise<any> {
		return this;
	}

	testFileName(needle: string): boolean {
		return this.file.startsWith(needle);
	}

	abstract down(): Promise<any>;

	abstract up(): Promise<any>;
}
