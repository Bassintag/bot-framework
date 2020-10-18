import { LogLevel } from '../../utils/logger';

export interface ILogEvent {
	level: LogLevel;

	date: string;

	message: any[];
}
