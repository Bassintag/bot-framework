import { IpcMainEvent } from 'electron';

export interface IIpcRequest<T> {
	readonly id: string;

	readonly payload: T;
}

export interface IBoundIpcRequest<T> extends IIpcRequest<T> {
	readonly event: IpcMainEvent;

	readonly channel: string;
}

export type IIpcResponse<T> = ISuccessIpcResponse<T> | IErrorIpcResponse<T>;

export interface ISuccessIpcResponse<T> {
	readonly success: true;

	readonly id: string;

	readonly payload: T;
}

export interface IErrorIpcResponse<T> {
	readonly success: false;

	readonly id: string;

	readonly error: string;
}
