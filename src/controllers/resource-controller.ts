import { inject, injectable } from 'inversify';
import { IResourceService } from '../services/resource-service';
import { IFilteredPageable } from '../domain/pageable';
import { IPage } from '../domain/page';
import { IMethodBinder } from './method-binder';
import { IDENTIFIERS } from '../constants/identifiers';
import { IController } from './controller';
import { Model } from 'sequelize-typescript';
import { IFilters } from '../domain/filter';

@injectable()
export class ResourceController<T extends Model<T>> implements IController {
	@inject(IDENTIFIERS.METHOD_BINDER)
	protected readonly methodBinder!: IMethodBinder;

	constructor(readonly path: string, readonly service: IResourceService<T>) {}

	public async count(filters: IFilters): Promise<number> {
		return this.service.count(filters);
	}

	public async get(id: string): Promise<object | null> {
		const resource = await this.service.get(id);
		if (resource != null) {
			return resource.toJSON();
		} else {
			return null;
		}
	}

	public async find(filters: IFilters): Promise<object | null> {
		const resource = await this.service.get(filters);
		if (resource != null) {
			return resource.toJSON();
		} else {
			return null;
		}
	}

	public async getMany(filters?: IFilters): Promise<object[]> {
		const resources = await this.service.getMany(filters);
		return resources.map((r) => r.toJSON());
	}

	public async getPage(pageable: IFilteredPageable): Promise<IPage<object>> {
		const page = await this.service.getPage(pageable, pageable.filters);
		return { ...page, items: page.items.map((i) => i.toJSON()) };
	}

	public async save(resource: T): Promise<object> {
		const saved = await this.service.save(resource);
		return saved.toJSON();
	}

	public async saveMany(resource: T[]): Promise<object> {
		const saved = await this.service.saveMany(resource);
		return saved.map((s) => s.toJSON());
	}

	public delete(resource: T): Promise<boolean> {
		return this.service.delete(resource);
	}

	public deleteMany(filters: IFilters): Promise<number> {
		return this.service.deleteMany(filters);
	}

	public async init(): Promise<void> {
		this.methodBinder.registerMethod<IFilters>(`${this.path}/count`, (p) => this.count(p));
		this.methodBinder.registerMethod<string>(`${this.path}/get`, (p) => this.get(p));
		this.methodBinder.registerMethod<IFilters>(`${this.path}/find`, (p) => this.find(p));
		this.methodBinder.registerMethod<IFilters>(`${this.path}/getMany`, (p) => this.getMany(p));
		this.methodBinder.registerMethod<IFilteredPageable>(`${this.path}/getPage`, (p) => this.getPage(p));
		this.methodBinder.registerMethod<T>(`${this.path}/save`, (p) => this.save(p));
		this.methodBinder.registerMethod<T[]>(`${this.path}/saveMany`, (p) => this.saveMany(p));
		this.methodBinder.registerMethod<T>(`${this.path}/delete`, (p) => this.delete(p));
		this.methodBinder.registerMethod<IFilters>(`${this.path}/deleteMany`, (p) => this.deleteMany(p));
	}
}
