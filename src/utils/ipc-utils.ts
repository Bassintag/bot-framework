import {ipcMain, IpcMainEvent} from 'electron';
import {fromEvent, Observable} from 'rxjs'
import {map} from 'rxjs/operators';
import {IBoundIpcRequest, IErrorIpcResponse, IIpcRequest, ISuccessIpcResponse} from '../domain/ipc-request';

export function observeIpcEvent<T = any>(channel: string): Observable<IBoundIpcRequest<T>> {
    return fromEvent<[IpcMainEvent, IIpcRequest<T>]>(ipcMain, channel).pipe(
        map(([event, request]) => ({
            id: request.id,
            payload: request.payload,
            event,
            channel,
        })),
    );
}

export function sendIpcResponse(request: IBoundIpcRequest<any>, payload: any): void {
    request.event.reply(request.channel, {
        success: true,
        id: request.id,
        payload,
    } as ISuccessIpcResponse<any>);
}

export function sendIpcError(request: IBoundIpcRequest<any>, error: string): void {
    request.event.reply(request.channel, {
        success: false,
        id: request.id,
        error,
    } as IErrorIpcResponse<any>);
}

