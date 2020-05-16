import {inject, injectable} from 'inversify';
import {IDENTIFIERS} from '../constants/identifiers';
import {IEventPublisher} from './event-publisher';
import {ILogger} from '../utils/logger';
import {IEventReceiver} from './event-receiver';
import {Observable, Subject} from 'rxjs';
import {filter, map} from 'rxjs/operators';

export interface IEventManager extends IEventPublisher, IEventReceiver {

    registerEventPublisher(publisher: IEventPublisher): void;
}

interface IEvent {

    eventType: string;

    payload: any;
}

@injectable()
export class EventManager implements IEventManager {

    private readonly $onEvent: Subject<IEvent>;

    private readonly $eventPublishers: IEventPublisher[];

    constructor(
        @inject(IDENTIFIERS.LOGGER)
        private readonly $logger: ILogger,
    ) {
        this.$onEvent = new Subject<IEvent>();
        this.$eventPublishers = [];
    }

    public publish(eventType: string, event: any): void {
        this.$logger.debug(`Publishing event "${eventType}"`);
        for (const publisher of this.$eventPublishers) {
            publisher.publish(eventType, event);
        }
        this.$onEvent.next({
            eventType,
            payload: event,
        });
    }

    public on<T>(eventType: string): Observable<T> {
        return this.$onEvent.pipe(
            filter((e) => e.eventType === eventType),
            map((e) => e.payload),
        );
    }

    public registerEventPublisher(publisher: IEventPublisher): void {
        this.$eventPublishers.push(publisher);
    }
}
