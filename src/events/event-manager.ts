import {injectable} from 'inversify';
import {IEventPublisher} from './event-publisher';
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

    constructor() {
        this.$onEvent = new Subject<IEvent>();
        this.$eventPublishers = [];
    }

    public publish(eventType: string, event: any): void {
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
