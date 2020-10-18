import { ScriptClient } from './script-client';
import { Script } from './script';

type ClientType<T extends ScriptClient> = new () => T;
type ScriptType<ClientT extends ScriptClient> = new (context: any, client: ClientT) => Script<any, any>;

export function launchScript<CT extends ScriptClient>(clientClass: ClientType<CT>, scriptClass: ScriptType<CT>): void {
	const client = new clientClass();
	client.getContext<any>().then(async (context) => {
		const script = new scriptClass(context, client);
		try {
			const result = await script.run();
			await client.complete(result);
		} catch (e) {
			console.error(e);
			let message: string = 'Error';
			if (e.constructor === Error) {
				message = e.message;
			} else if (typeof e === 'string') {
				message = e;
			}
			await client.error(message);
		}
	});
}
