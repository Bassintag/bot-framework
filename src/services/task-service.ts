import {ITask} from '../task/task';
import {Resource} from '../resource/resource';
import {inject, injectable} from 'inversify';
import {Observable, Subject} from 'rxjs';
import {ILogger} from '../utils/logger';
import {IDENTIFIERS} from '../constants/identifiers';
import {IFilters} from '../domain/filter';

export interface ITaskService<T, TaskT extends ITask<T> = ITask<T>> {

    readonly addedToQueue: Observable<TaskT[]>;
    readonly started: Observable<TaskT[]>;
    readonly stopped: Observable<TaskT[]>;
    readonly completed: Observable<TaskT[]>;
    readonly failed: Observable<TaskT[]>;

    start(task: T): Promise<void>;

    startAll(filters?: IFilters): Promise<void>;

    stop(task: T): Promise<void>;

    stopAll(filters?: IFilters): Promise<void>;
}

interface QueuedTask<T> {

    execTime: number;

    task: T;
}

@injectable()
export abstract class TaskService<T extends Resource<any>, ResultT = any, TaskT extends ITask<T> = ITask<T>> implements ITaskService<T, TaskT> {

    private readonly $queue: QueuedTask<TaskT>[];
    private readonly $running: TaskT[];

    private readonly $addedToQueueSubject: Subject<TaskT[]>;
    private readonly $startedSubject: Subject<TaskT[]>;
    private readonly $stoppedSubject: Subject<TaskT[]>;
    private readonly $completedSubject: Subject<TaskT[]>;
    private readonly $failedSubject: Subject<TaskT[]>;

    @inject(IDENTIFIERS.LOGGER)
    readonly logger!: ILogger;

    get addedToQueue(): Observable<TaskT[]> {
        return this.$addedToQueueSubject.asObservable();
    }

    get started(): Observable<TaskT[]> {
        return this.$startedSubject.asObservable();
    }

    get stopped(): Observable<TaskT[]> {
        return this.$stoppedSubject.asObservable();
    }

    get completed(): Observable<TaskT[]> {
        return this.$completedSubject.asObservable();
    }

    get failed(): Observable<TaskT[]> {
        return this.$failedSubject.asObservable();
    }

    protected constructor() {
        this.$queue = [];
        this.$running = [];
        this.$addedToQueueSubject = new Subject<TaskT[]>();
        this.$startedSubject = new Subject<TaskT[]>();
        this.$stoppedSubject = new Subject<TaskT[]>();
        this.$completedSubject = new Subject<TaskT[]>();
        this.$failedSubject = new Subject<TaskT[]>();
    }

    public async start(resource: T): Promise<void> {
        this.addToQueue([resource]);
    }

    public async startAll(filters?: IFilters): Promise<void> {
        const all = (await this.findAll(filters))
            .filter((t) => !this.$queue.find((q) => q.task.model!.id === t.id))
            .filter((t) => !this.$running.find((r) => r.model!.id === t.id));
        this.addToQueue(all);
    }

    public async stop(resource: T): Promise<void> {
        this.removeFromRunning([resource]);
        this.removeFromQueue([resource]);
    }

    public async stopAll(filters?: IFilters): Promise<void> {
        const all = await this.findAll(filters);
        this.removeFromRunning(all);
        this.removeFromQueue(all);
    }

    protected abstract findAll(filters?: IFilters): Promise<T[]>;

    protected abstract createTask(resource: T): Promise<TaskT>;

    protected abstract getMaxConcurrentTasks(): Promise<number>;

    protected getDelay(resource: T): number {
        return 0;
    }

    private removeFromRunning(resources: T[], notice: boolean = true): void {
        const tasks: TaskT[] = [];
        for (const resource of resources) {
            const index = this.$running.findIndex((r) => r.model!.id === resource.id);
            if (index >= 0) {
                const task = this.$running[index];
                tasks.push(task);
                this.$running.splice(index, 1);
                task.stop();
            }
        }
        if (notice) {
            this.$stoppedSubject.next(tasks);
        }
    }

    private removeFromQueue(resources: T[]): void {
        const tasks: TaskT[] = [];
        for (const resource of resources) {
            const index = this.$queue.findIndex((r) => r.task.model!.id === resource.id);
            if (index >= 0) {
                const task = this.$queue[index];
                tasks.push(task.task);
                this.$queue.splice(index, 1);
            }
        }
        this.$stoppedSubject.next(tasks);
    }

    private async addToQueue(resources: T[]): Promise<void> {
        const tasks: TaskT[] = [];
        for (const resource of resources) {
            const task = await this.createTask(resource);
            const delay = this.getDelay(resource);
            const execTime = delay + Date.now();
            this.$queue.push({
                task,
                execTime,
            });
            if (delay > 0) {
                setTimeout(() => this.refreshQueue(), delay);
            }
            tasks.push(task);
        }
        this.$addedToQueueSubject.next(tasks);
        await this.refreshQueue();
    }

    private async refreshQueue(): Promise<void> {
        const max = await this.getMaxConcurrentTasks();
        for (let i = this.$running.length; i < max && this.$queue.length > 0; i += 1) {
            const top = this.$queue[0];
            if (top.execTime <= Date.now()) {
                const task = this.$queue.shift()!.task;
                this.$running.push(task);
                this.$startedSubject.next([task]);
                this.logger.info('Starting task:', task.model!.id);
                const promise = task.run();
                promise.then(() => {
                    this.logger.info('Task completed:', task.model!.id);
                    this.$completedSubject.next([task]);
                }).catch((err) => {
                    this.logger.info('Task failed:', task.model!.id);
                    this.logger.error(err);
                    this.$failedSubject.next([task]);
                }).then(() => {
                    this.removeFromRunning([task.model!], false);
                    this.refreshQueue();
                });
            }
        }
    }
}
