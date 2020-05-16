import {IIpcRequest, IIpcResponse} from './ipc-request';

export interface IProcessRequest<T> {

    channel: string;

    request: IIpcRequest<T>;
}

export interface IProcessResponse<T> {

    channel: string;

    response: IIpcResponse<T>;
}
