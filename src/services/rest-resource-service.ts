import { Repository } from 'sequelize-typescript';
import { injectable, unmanaged } from 'inversify';
import { FilterOperation, IFilters } from '../domain/filter';
import { ISort } from '../domain/sort';
import { FindOptions, Includeable } from 'sequelize';
import { mapFiltersToWhere } from '../utils/filter';
import { Resource } from '../resource/resource';
import { IPageable } from '../domain/pageable';
import { IPage } from '../domain/page';

export interface IGetOptions {
	filters?: IFilters;
	attributes?: string[];
	includes?: string[];
	sort?: ISort;
}

export interface IDeleteManyOptions {
	filters?: IFilters;
}

export interface IRestResourceServiceOptions {
	includesMapping?: {
		[key: string]: Repository<any>;
	};
}

export interface IPartialResource {
	id: string;

	[key: string]: any;
}

export interface IRestResourceService<T> {
	get(id: string, options?: IGetOptions): Promise<T | null>;

	getMany(options?: IGetOptions): Promise<T[]>;

	getPage(pageable: IPageable, options?: IGetOptions): Promise<IPage<T>>;

	save(resource: IPartialResource): Promise<T>;

	saveMany(resources: IPartialResource[]): Promise<T[]>;

	delete(option: string | IPartialResource): Promise<boolean>;

	deleteMany(options?: IDeleteManyOptions): Promise<number>;
}

@injectable()
export class RestResourceService<T extends Resource<any>> implements IRestResourceService<T> {
	private readonly $repository: Repository<T>;

	private readonly $resourceName: string;

	private readonly $options: IRestResourceServiceOptions;

	private readonly $filteredColumns: string[];

	constructor(repository: Repository<T>, @unmanaged() resourceName: string, options: IRestResourceServiceOptions = {}) {
		this.$repository = repository;
		this.$resourceName = resourceName;
		this.$options = options;
		this.$filteredColumns = Object.keys(repository.rawAttributes).filter((a) => repository.primaryKeyAttribute !== a);
	}

	private mapGetOptions(options: IGetOptions): FindOptions {
		const where = mapFiltersToWhere(options.filters);
		const order = options.sort != null ? [options.sort.value, options.sort.direction || 'ASC'] : undefined;
		const include: Includeable[] = [];
		if (options.includes) {
			for (const i of options.includes) {
				include.push(this.$options.includesMapping![i]);
			}
		}
		return {
			where,
			order,
			include,
			attributes: options.attributes,
		};
	}

	get(id: string, options: IGetOptions = {}): Promise<T | null> {
		if (options == null) {
			options = {};
		}
		if (options.filters == null) {
			options.filters = {};
		}
		options.filters['id'] = id;
		const mapped = this.mapGetOptions(options);
		return this.$repository.findOne(mapped);
	}

	getMany(options: IGetOptions = {}): Promise<T[]> {
		const mapped = this.mapGetOptions(options);
		return this.$repository.findAll(mapped);
	}

	async getPage(pageable: IPageable, options: IGetOptions = {}): Promise<IPage<T>> {
		const mapped = this.mapGetOptions(options);
		const result = await this.$repository.findAndCountAll({
			...mapped,
			limit: pageable.size,
			offset: pageable.page * pageable.size,
		});
		return {
			number: pageable.page,
			size: pageable.size,
			total: result.count,
			totalPages: Math.ceil(result.count / pageable.size),
			count: result.rows.length,
			items: result.rows,
		};
	}

	async save(resource: T | IPartialResource): Promise<T> {
		let payload: object;
		if (resource.toJSON) {
			payload = resource.toJSON();
		} else {
			payload = resource;
		}
		if (resource.id) {
			await this.$repository.update(payload, {
				where: { id: resource.id },
			});
			return (await this.$repository.findOne({
				where: { id: resource.id },
			}))!;
		} else {
			return this.$repository.create(payload);
		}
	}

	async saveMany(resources: (IPartialResource | T)[]): Promise<T[]> {
		const mapped: IPartialResource[] = resources.map((r) => {
			if (r.toJSON) {
				return r.toJSON();
			}
			return r;
		});
		const toCreate = mapped.filter((r) => r.id == null);
		const toUpdate = mapped.filter((r) => r.id != null);
		const raw = await Promise.all([
			this.$repository.bulkCreate(toCreate),
			this.$repository.bulkCreate(toUpdate, {
				updateOnDuplicate: this.$filteredColumns,
			}),
		]);
		return this.getMany({
			filters: {
				id: {
					operation: FilterOperation.IN,
					value: raw.flatMap((r) => r.map((r) => r.id!)),
				},
			},
		});
	}

	async delete(option: string | IPartialResource): Promise<boolean> {
		let id: string;
		if (typeof option === 'string') {
			id = option;
		} else {
			id = option.id!;
		}
		const destroyed = await this.$repository.destroy({ where: { id } });
		return destroyed > 0;
	}

	deleteMany(options: IDeleteManyOptions = {}): Promise<number> {
		const mapped = mapFiltersToWhere(options.filters);
		return this.$repository.destroy({ where: mapped });
	}
}
