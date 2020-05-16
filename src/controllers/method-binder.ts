import {injectable, multiInject} from 'inversify';
import {IDENTIFIERS} from '../constants/identifiers';

export interface IMethodBinder {
    registerMethod<T>(event: string, handler: (payload: T) => Promise<any>): void;
}

@injectable()
export class MethodBinder implements IMethodBinder {

    constructor(
        @multiInject(IDENTIFIERS.CONTROLLER_METHOD_BINDER)
        private readonly $controllerMethodBinders: IMethodBinder[],
    ) {
    }

    public registerMethod<T>(event: string, handler: (payload: T) => Promise<any>): void {
        for (const methodBinder of this.$controllerMethodBinders) {
            methodBinder.registerMethod(event, handler);
        }
    }

}
