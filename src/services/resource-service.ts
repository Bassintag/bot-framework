import {IPage} from '../domain/page';
import {IPageable} from '../domain/pageable';
import {inject, injectable, unmanaged} from 'inversify';
import {Model, Repository} from 'sequelize-typescript';
import {IDENTIFIERS} from '../constants/identifiers';
import {IEventPublisher} from '../events/event-publisher';
import {InvalidResourceIdError} from '../errors/invalid-resource-id-error';
import {literal, Op, WhereOptions, WhereValue} from 'sequelize';
import {FilterOperation, IFilter, IFilters} from '../domain/filter';

export interface ISaveOptions {

    conflictKey?: string;
}

export interface IResourceService<T> {

    count(filters?: IFilters): Promise<number>;

    get(id: string): Promise<T | null>;

    get(filters: IFilters): Promise<T | null>;

    getMany(filters?: IFilters): Promise<T[]>;

    getPage(pageable: IPageable, filters?: IFilters): Promise<IPage<T>>;

    save(resource: T | any, options?: ISaveOptions): Promise<T>;

    saveMany(resources: (T | any)[], options?: ISaveOptions): Promise<T[]>;

    delete(resource: T): Promise<boolean>;

    deleteMany(filters: IFilters): Promise<number>;
}

function mapFilterToWhere(filter: IFilter): WhereOptions | WhereValue {
    switch (filter.operation) {
        case FilterOperation.EQUAL:
            if (filter.value == null) {
                return {
                    [Op.is]: undefined,
                };
            } else {
                return {
                    [Op.eq]: filter.value
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
        case FilterOperation.INCLUDE:
            if (Array.isArray(filter.value)) {
                return {
                    [Op.in]: filter.value,
                };
            } else {
                return {
                    [Op.like]: `%${filter.value}%`,
                };
            }
        case FilterOperation.NOT_INCLUDE:
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

function mapFiltersToWhere(filters?: IFilters): WhereOptions {
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

@injectable()
export class ResourceService<T extends Model<T>> implements IResourceService<T> {

    @inject(IDENTIFIERS.EVENT_MANAGER)
    private readonly $eventManager!: IEventPublisher;

    constructor(
        private readonly $repository: Repository<T>,
        @unmanaged() private readonly $resourceName: string,
        @unmanaged() private readonly $includes: Repository<any>[] = [],
    ) {
    }

    public async count(filters?: IFilters): Promise<number> {
        const where = mapFiltersToWhere(filters);
        return this.$repository.count({where});
    }

    public async get(option: string | IFilters): Promise<T | null> {
        let existing: T | null;
        if (typeof option === 'string') {
            existing = await this.$repository.findOne({
                where: {'id': option},
                include: this.$includes,
            });
        } else {
            existing = await this.$repository.findOne({
                where: mapFiltersToWhere(option),
                include: this.$includes,
            });
        }
        return existing || null;
    }

    public async getMany(filters?: IFilters): Promise<T[]> {
        const where = mapFiltersToWhere(filters);
        return this.$repository.findAll({
            where,
            include: this.$includes,
        });
    }

    public async getPage(pageable: IPageable, filters?: IFilters): Promise<IPage<T>> {
        const where = mapFiltersToWhere(filters);
        const results = await this.$repository.findAll({
            limit: pageable.size,
            offset: pageable.size * pageable.page,
            order: pageable.sort,
            where,
            include: this.$includes,
        });
        const total = await this.$repository.count({where});
        return {
            number: pageable.page,
            size: pageable.size,
            count: results.length,
            total,
            totalPages: Math.ceil(total / pageable.size),
            items: results,
        };
    }

    public async save(resource: T): Promise<T> {
        if (resource.id) {
            let payload: any;
            if (resource.toJSON) {
                payload = resource.toJSON();
            } else {
                payload = resource;
            }
            await this.$repository.update(payload, {
                where: {'id': resource.id},
            });
            const existing = await this.get(resource.id);
            if (!existing) {
                throw new InvalidResourceIdError('Invalid id ' + resource.id + ' for resource: ' + this.$resourceName);
            }
            resource = existing;
            this.$eventManager.publish(`${this.$resourceName}/updated`, [resource.toJSON()]);
        } else {
            resource = await this.$repository.create(resource, {
                include: this.$includes,
            });
            this.$eventManager.publish(`${this.$resourceName}/created`, [resource.toJSON()]);
        }
        return resource;
    }

    public async saveMany(resources: T[], {conflictKey = 'id'}: ISaveOptions = {}): Promise<T[]> {
        const toUpdate = resources.filter(r => r.id != null);
        const columns = Object.keys(this.$repository.rawAttributes).filter((k) => k !== conflictKey);
        const values = resources.map((r) => {
            if (r.toJSON) {
                return r.toJSON();
            }
            return r;
        });
        const raw = await this.$repository.bulkCreate(values, {
            updateOnDuplicate: columns,
        });
        const saved = await this.getMany({
            'id': {
                operation: FilterOperation.INCLUDE,
                value: raw.map((r) => r.id),
            },
        });
        const updated = saved.filter((s) => toUpdate.find((u) => u.id === s.id));
        const created = saved.filter((s) => !toUpdate.find((u) => u.id === s.id));
        if (updated.length > 0) {
            this.$eventManager.publish(`${this.$resourceName}/updated`, updated.map((c) => c.toJSON()));
        }
        if (created.length > 0) {
            this.$eventManager.publish(`${this.$resourceName}/created`, created.map((c) => c.toJSON()));
        }
        return saved;
    }

    public async delete(resource: T): Promise<boolean> {
        if (resource.id) {
            const existing = await this.get(resource.id);
            if (existing) {
                await this.$repository.destroy({where: {'id': existing.id}});
                this.$eventManager.publish(`${this.$resourceName}/deleted`, [existing.toJSON()]);
                return true;
            }
        }
        return false;
    }

    public async deleteMany(filters: IFilters): Promise<number> {
        const where = mapFiltersToWhere(filters);
        const ret = this.$repository.destroy({where});
        this.$eventManager.publish(`${this.$resourceName}/deleted`, []);
        return ret;
    }
}
