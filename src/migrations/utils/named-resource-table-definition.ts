import { ResourceTableDefinition } from './resource-table-definition';
import { STRING } from 'sequelize';

export class NamedResourceTableDefinition extends ResourceTableDefinition {
	['name'] = {
		type: STRING,
		allowNull: false,
	};
}
