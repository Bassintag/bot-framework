import { EventPublisher } from '../event-publisher';
import { webContents } from 'electron';
import { injectable } from 'inversify';

@injectable()
export class ElectronEventPublisher extends EventPublisher {
	constructor() {
		super();
	}

	public publish(eventType: string, event: any): void {
		for (const wc of webContents.getAllWebContents()) {
			wc.send(`event/${eventType}`, event);
		}
	}
}
