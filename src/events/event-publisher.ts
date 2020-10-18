import { inject, injectable, multiInject } from 'inversify';
import { IOnInit } from '../utils/on-init';
import { IDENTIFIERS } from '../constants/identifiers';
import { IEventManager } from './event-manager';

export interface IEventPublisher {
	publish(eventType: string, event: any): void;
}

@injectable()
export abstract class EventPublisher implements IEventPublisher, IOnInit {
	@inject(IDENTIFIERS.EVENT_MANAGER)
	private readonly $eventManager!: IEventManager;

	public async init(): Promise<void> {
		this.$eventManager.registerEventPublisher(this);
	}

	public abstract publish(eventType: string, event: any): void;
}
