import { FilterOperation, IFilter, IFilters } from '../domain/filter';
import { literal, Op, WhereOptions, WhereValue } from 'sequelize';

export function mapFilterToWhere(filter: IFilter): WhereOptions | WhereValue {
	if (typeof filter === 'string' || filter == null) {
		return filter;
	}
	switch (filter.operation) {
		case FilterOperation.EQUAL:
			if (filter.value == null) {
				return {
					[Op.is]: undefined,
				};
			} else {
				return {
					[Op.eq]: filter.value,
				};
			}
		case FilterOperation.NOT_EQUAL:
			if (filter.value == null) {
				return {
					[Op.is]: literal('NOT NULL'),
				};
			} else {
				return {
					[Op.ne]: filter.value,
				};
			}
		case FilterOperation.IN:
			if (Array.isArray(filter.value)) {
				return {
					[Op.in]: filter.value,
				};
			} else {
				return {
					[Op.like]: `%${filter.value}%`,
				};
			}
		case FilterOperation.NOT_IN:
			if (Array.isArray(filter.value)) {
				return {
					[Op.notIn]: filter.value,
				};
			} else {
				return {
					[Op.notLike]: `%${filter.value}%`,
				};
			}
		default:
			throw new Error('Invalid filter operation');
	}
}

export function mapFiltersToWhere(filters?: IFilters): WhereOptions {
	const where: WhereOptions = {};
	if (filters) {
		const filterKeys = Object.keys(filters);
		for (const key of filterKeys) {
			const filter = filters[key];
			where[key] = mapFilterToWhere(filter);
		}
	}
	return where;
}
