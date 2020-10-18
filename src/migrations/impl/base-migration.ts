import { Migration } from '../migration';
import { injectable } from 'inversify';
import { STRING } from 'sequelize';
import { NamedResourceTableDefinition } from '../utils/named-resource-table-definition';

@injectable()
export class BaseMigration extends Migration {
	constructor() {
		super('0000_initial');
	}

	async down(): Promise<any> {
		await this.queryInterface.dropTable('SettingsMetadata');
	}

	async up(): Promise<any> {
		await this.queryInterface.createTable(
			'SettingsMetadata',
			new NamedResourceTableDefinition({
				value: {
					type: STRING,
					allowNull: false,
				},
			})
		);
	}
}
