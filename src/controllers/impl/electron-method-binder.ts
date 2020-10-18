import { inject, injectable } from 'inversify';
import { observeIpcEvent, sendIpcError, sendIpcResponse } from '../../utils/ipc-utils';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { IOnDispose } from '../../utils/on-dispose';
import { IMethodBinder } from '../method-binder';
import { ILogger } from '../../utils/logger';
import { IDENTIFIERS } from '../../constants/identifiers';

@injectable()
export class ElectronMethodBinder implements IOnDispose, IMethodBinder {
	private readonly $destroyed: Subject<void>;

	constructor(
		@inject(IDENTIFIERS.LOGGER)
		private readonly $logger: ILogger
	) {
		this.$destroyed = new Subject<void>();
	}

	public registerMethod<T>(event: string, handler: (payload: T) => Promise<any>): void {
		this.$logger.debug('Registering event:', event);
		observeIpcEvent<T>(event)
			.pipe(takeUntil(this.$destroyed))
			.subscribe(async (request) => {
				this.$logger.debug(`Got event "${event}", id = ${request.id}`);
				try {
					const responsePayload = await handler(request.payload);
					this.$logger.debug(`Sending response to "${event}", id = ${request.id}`);
					await sendIpcResponse(request, responsePayload);
				} catch (e) {
					let message = e;
					if (e instanceof Error) {
						this.$logger.error(`Error while handling "${event}", id = ${request.id}`);
						message = e.message;
					}
					console.error(e);
					await sendIpcError(request, message);
				}
			});
	}

	public async dispose(): Promise<void> {
		this.$destroyed.next();
		this.$destroyed.complete();
	}
}
