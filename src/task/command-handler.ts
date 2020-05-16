import {Observable} from 'rxjs';

export interface ICommandHandler<PT = any, RT = any> {

    handle(payload: PT): Observable<RT> | void;
}
