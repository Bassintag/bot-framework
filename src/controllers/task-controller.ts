import { Resource } from '../resource/resource';
import { inject, injectable } from 'inversify';
import { IController } from './controller';
import { ITaskService } from '../services/task-service';
import { IDENTIFIERS } from '../constants/identifiers';
import { IMethodBinder } from './method-binder';
import { IFilters } from '../domain/filter';

@injectable()
export class TaskController<T extends Resource<T>> implements IController {
	@inject(IDENTIFIERS.METHOD_BINDER)
	protected readonly methodBinder!: IMethodBinder;

	constructor(readonly path: string, private readonly $taskService: ITaskService<T>) {}

	public async start(task: T): Promise<void> {
		const mapped = await this.map(task);
		return this.$taskService.start(mapped);
	}

	public async startAll(filters?: IFilters): Promise<void> {
		return this.$taskService.startAll(filters);
	}

	public async stop(task: T): Promise<void> {
		return this.$taskService.stop(task);
	}

	public async stopAll(filters?: IFilters): Promise<void> {
		return this.$taskService.stopAll(filters);
	}

	public async init(): Promise<void> {
		this.methodBinder.registerMethod<T>(`${this.path}/start`, (p) => this.start(p));
		this.methodBinder.registerMethod<IFilters | undefined>(`${this.path}/startAll`, (p) => this.startAll(p));
		this.methodBinder.registerMethod<T>(`${this.path}/stop`, (p) => this.stop(p));
		this.methodBinder.registerMethod<IFilters | undefined>(`${this.path}/stopAll`, (p) => this.stopAll(p));
	}

	protected async map(payload: T): Promise<T> {
		return payload;
	}
}
