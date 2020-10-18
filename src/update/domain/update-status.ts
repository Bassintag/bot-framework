export enum IUpdateStatusType {
	PROCESSING = 'processing',
	READY = 'ready',
	IDLE = 'idle',
}

export interface IUpdateStatus {
	type: IUpdateStatusType;

	message: string;
}
