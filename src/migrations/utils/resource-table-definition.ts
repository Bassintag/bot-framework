import { DataType, DATE, ModelAttributeColumnOptions, ModelAttributes, UUID, UUIDV4 } from 'sequelize';

export class ResourceTableDefinition implements ModelAttributes {
	[name: string]: DataType | ModelAttributeColumnOptions;

	['id'] = {
		type: UUID,
		allowNull: false,
		defaultValue: UUIDV4,
		primaryKey: true,
	};

	['createdAt'] = {
		type: DATE,
		allowNull: false,
	};

	['updatedAt'] = {
		type: DATE,
		allowNull: false,
	};

	constructor(attributes?: ModelAttributes) {
		if (attributes) {
			const keys = Object.keys(attributes);
			for (const key of keys) {
				this[key] = attributes[key];
			}
		}
	}
}
