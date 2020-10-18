import { v4 as uuid } from 'uuid';
import { IProcessRequest, IProcessResponse } from '../domain/process-request';

export interface IScriptClient {
	sendRequest<T>(channel: string, data: any): Promise<T>;
}

export class ScriptClient<ResultT = any> implements IScriptClient {
	public async sendRequest<T = void>(channel: string, payload: any = null, hasResult: boolean = true): Promise<T> {
		console.log('request init', channel, payload);
		const id = uuid();
		const request: IProcessRequest<any> = {
			channel,
			request: {
				id,
				payload,
			},
		};
		let result: any;
		if (hasResult) {
			result = new Promise<T>((resolve, reject) => {
				const handler = (message: IProcessResponse<T>) => {
					if (message.channel === channel) {
						const response = message.response;
						if (response.id === id) {
							console.log('<=', response);
							// @ts-ignore
							process.removeListener('message', handler);
							if (response.success) {
								resolve(response.payload);
							} else {
								reject(response.error);
							}
						}
					}
				};
				process.on('message', handler);
			});
		}
		console.log('=>', request);
		process.send!(request);
		return result;
	}

	public async getContext<T>(): Promise<T> {
		return this.sendRequest<T>('get-context');
	}

	public async complete(result: ResultT): Promise<void> {
		return this.sendRequest('complete', result, false);
	}

	public async error(error: any): Promise<void> {
		return this.sendRequest('error', error, false);
	}
}
