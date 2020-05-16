import {Observable} from 'rxjs';

export interface IEventReceiver {

    on<T>(eventType: string): Observable<T>;
}
