import {ITask} from './task';
import {ChildProcess, fork} from 'child_process';
import {TaskAlreadyStartedError} from '../errors/task-already-started-error';
import {TaskNotStartedError} from '../errors/task-not-started-error';
import {ICommandHandler} from './command-handler';
import {IProcessRequest, IProcessResponse} from '../domain/process-request';
import {fromEventPattern, Observable, of, Subject} from 'rxjs';
import {flatMap, map, take, takeUntil} from 'rxjs/operators';
import {inject, injectable} from 'inversify';
import {ILogger} from '../utils/logger';
import {IDENTIFIERS} from '../constants/identifiers';

function fromProcessEvent<T>(process: ChildProcess, event: string): Observable<T> {
    return fromEventPattern<any>(
        (h) => process.on(event, h),
        (h) => process.removeListener(event as any, h),
    ).pipe(map(([event]) => event as T));
}

@injectable()
export abstract class TaskProcess<T, ResultT = any, ContextT = any> implements ITask<T, ResultT> {

    private readonly $stopped: Subject<void>;
    private readonly $completed: Subject<ResultT>;
    private readonly $failed: Subject<string>;
    private readonly $handlers: { [key: string]: ICommandHandler };

    private $error?: string;
    private $model?: T;
    private $context?: ContextT;
    private $scriptPath?: string;

    get error(): string | undefined {
        return this.$error;
    }

    get context(): ContextT | undefined {
        return this.$context;
    }

    get model(): T | undefined {
        return this.$model;
    }

    result?: ResultT;

    process?: ChildProcess;

    @inject(IDENTIFIERS.LOGGER)
    private readonly $logger!: ILogger;

    constructor() {
        this.$handlers = {};
        this.$stopped = new Subject<void>();
        this.$completed = new Subject<ResultT>();
        this.$failed = new Subject<string>();
        this.addCommandHandler('get-context', {
            handle: () => of(this.$context),
        });
        this.addCommandHandler('complete', {
            handle: (val: ResultT) => {
                this.result = val;
                this.$completed.next(val);
            },
        });
        this.addCommandHandler('error', {
            handle: (err: string) => {
                this.$failed.next(err);
            },
        });
    }

    private async handleMessage(request: IProcessRequest<any>): Promise<IProcessResponse<any>> {
        const channel = request.channel;
        const handler = this.$handlers[channel];
        if (!handler) {
            throw new Error('No handler for request type: ' + channel);
        }
        return new Promise((resolve) => {
            const obs = handler.handle(request.request.payload);
            if (obs != null) {
                obs.pipe(
                    takeUntil(this.$stopped),
                    take(1),
                ).subscribe((result) => {
                    resolve({
                        channel,
                        response: {
                            id: request.request.id,
                            success: true,
                            payload: result,
                        }
                    });
                }, (err) => {
                    this.$logger.error('Error while handling request of type:', channel);
                    this.$logger.error(err);
                    let errorMessage: string = 'Error';
                    if (err instanceof Error) {
                        errorMessage = err.message;
                    }
                    resolve({
                        channel,
                        response: {
                            id: request.request.id,
                            success: false,
                            error: errorMessage,
                        }
                    });
                });
            } else {
                resolve({
                    channel,
                    response: {
                        id: request.request.id,
                        success: true,
                        payload: null,
                    }
                });
            }
        });
    }

    private stopInternal() {
        this.$stopped.next();
        this.$stopped.complete();
        this.$failed.complete();
        this.$completed.complete();
    }

    public init(model: T, scriptPath: string) {
        this.$model = model;
        this.$scriptPath = scriptPath;
    }

    public addCommandHandler<T = any>(channel: string, handler: ICommandHandler<T>): void {
        this.$handlers[channel] = handler;
    }

    protected abstract buildContext(): Promise<ContextT>

    public async run(): Promise<ResultT> {
        if (this.process) {
            throw new TaskAlreadyStartedError();
        }
        if (this.context == null) {
            this.$context = await this.buildContext();
        }
        this.process = fork(this.$scriptPath!, [], {detached: true});
        fromProcessEvent<IProcessRequest<any>>(this.process, 'message').pipe(
            flatMap((request) => this.handleMessage(request)),
            takeUntil(this.$stopped),
        ).subscribe(async (response: any) => {
            if (response != null && this.process!) {
                this.process!.send(response);
            }
        });
        return new Promise<ResultT>((resolve, reject) => {
            const complete = (res: ResultT) => {
                this.stopInternal();
                resolve(res);
            };
            const error = (err?: string) => {
                this.$error = err;
                this.stopInternal();
                reject(err);
            };
            this.$completed.subscribe((res) => complete(res));
            this.$failed.subscribe((res) => error(res));
            fromProcessEvent(this.process!, 'exit').pipe(
                takeUntil(this.$stopped),
            ).subscribe(() => error());
            fromProcessEvent(this.process!, 'error').pipe(
                takeUntil(this.$stopped),
            ).subscribe(() => error());
        });
    }

    public stop(): void {
        if (!this.process) {
            throw new TaskNotStartedError();
        }
        this.stopInternal();
        this.process.kill();
    }

}
