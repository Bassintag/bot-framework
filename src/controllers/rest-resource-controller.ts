import { IController } from './controller';
import { inject, injectable } from 'inversify';
import { IResourceService } from '../services/resource-service';
import { IGetOptions, IPartialResource, IRestResourceService } from '../services/rest-resource-service';
import { IDENTIFIERS } from '../constants/identifiers';
import { IMethodBinder } from './method-binder';
import * as path from 'path';
import { Resource } from '../resource/resource';
import { CONTROLLER_METHODS } from '../constants/controller-methods';
import { IPageable } from '../domain/pageable';
import { IPage } from '../domain/page';
import { IFilters } from '../domain/filter';

@injectable()
export class RestResourceController<T extends Resource<any>> implements IController {
	@inject(IDENTIFIERS.METHOD_BINDER)
	protected readonly methodBinder!: IMethodBinder;

	constructor(readonly path: string, readonly service: IRestResourceService<T>) {}

	async get(id: string, options?: IGetOptions): Promise<object | null> {
		const resource = await this.service.get(id, options);
		if (resource == null) {
			return null;
		} else {
			return resource.toJSON();
		}
	}

	async getMany(options?: IGetOptions): Promise<object[]> {
		const resources = await this.service.getMany(options);
		return resources.map((r) => r.toJSON());
	}

	async getPage(pageable: IPageable, options?: IGetOptions): Promise<IPage<object>> {
		const page = await this.service.getPage(pageable, options);
		return {
			...page,
			items: page.items.map((i) => i.toJSON()),
		};
	}

	async save(attributes: IPartialResource): Promise<object> {
		const resource = await this.service.save(attributes);
		return resource.toJSON();
	}

	async saveMany(attributesArray: IPartialResource[]): Promise<object[]> {
		const resources = await this.service.saveMany(attributesArray);
		return resources.map((r) => r.toJSON());
	}

	async delete(option: string | IPartialResource): Promise<boolean> {
		return this.service.delete(option);
	}

	async deleteMany(filters?: IFilters): Promise<number> {
		return this.service.deleteMany({ filters });
	}

	private bindMethod(event: string, handler: (params: any) => any) {
		this.methodBinder.registerMethod(path.join(this.path, event), handler);
	}

	async init(): Promise<void> {
		this.bindMethod(CONTROLLER_METHODS.GET, (p) => this.get(p[0], p[1]));
		this.bindMethod(CONTROLLER_METHODS.GET_MANY, (p) => this.getMany(p[0]));
		this.bindMethod(CONTROLLER_METHODS.GET_PAGE, (p) => this.getPage(p[0], p[1]));
		this.bindMethod(CONTROLLER_METHODS.SAVE, (p) => this.save(p[0]));
		this.bindMethod(CONTROLLER_METHODS.SAVE_MANY, (p) => this.saveMany(p[0]));
		this.bindMethod(CONTROLLER_METHODS.DELETE, (p) => this.delete(p[0]));
		this.bindMethod(CONTROLLER_METHODS.DELETE_MANY, (p) => this.deleteMany(p[0]));
	}
}
