export interface ITask<ModelT = any, ResultT = any> {
	readonly model?: ModelT;

	readonly result?: ResultT;

	init(model: ModelT, scriptPath: string): void;

	run(): Promise<ResultT>;

	stop(): void;
}
