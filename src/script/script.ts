export interface IScript<T> {

    run(): Promise<T>;
}


export abstract class Script<ContextT = any, ClientT = any, T = any> implements IScript<T> {

    readonly context: ContextT;

    readonly client: ClientT;

    protected constructor(
        context: ContextT,
        client: ClientT,
    ) {
        this.context = context;
        this.client = client;
    }

    protected abstract runScript(): Promise<T>;

    protected async mapResult(result: T): Promise<T> {
        return result;
    }

    public async run(): Promise<T> {
        const result = await this.runScript();
        return await this.mapResult(result);
    }
}
