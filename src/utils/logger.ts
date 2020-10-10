import moment from 'moment';
import {inject, injectable} from 'inversify';
import {IDENTIFIERS} from '../constants/identifiers';
import {IEventManager} from '../events/event-manager';
import {ILogEvent} from '../events/domain/log-event';
import {EVENTS} from '../constants/events';

export enum LogLevel {
    ALL,
    DEBUG,
    INFO,
    WARN,
    ERROR,
    OFF,
}

export interface ILogger {

    loggingLevel: LogLevel;

    info(...message: any[]): void;

    error(...message: any[]): void;

    warn(...message: any[]): void;

    debug(...message: any[]): void;
}

@injectable()
export class Logger implements ILogger {

    set loggingLevel(level: LogLevel) {
        this.$loggingLevel = level;
    }

    get loggingLevel(): LogLevel {
        return this.$loggingLevel;
    }

    constructor(
        @inject(IDENTIFIERS.EVENT_MANAGER)
        private $eventManager: IEventManager,
        @inject(IDENTIFIERS.LOG_LEVEL)
        private $loggingLevel: LogLevel = LogLevel.ALL,
    ) {
    }

    private log(level: LogLevel, title: string, message: any[]): void {
        if (this.$loggingLevel <= level) {
            const date = moment().format('HH:mm:ss:SSS');
            console.log(`[${date}]`, `[${title}]`, ...message);
            this.$eventManager.publish(EVENTS.LOG, {
                level,
                message,
                date,
            } as ILogEvent);
        }
    }

    public debug(...message: any[]): void {
        this.log(LogLevel.DEBUG, 'debug', message);
    }

    public info(...message: any[]): void {
        this.log(LogLevel.INFO, 'info', message);
    }

    public warn(...message: any[]): void {
        this.log(LogLevel.WARN, 'warn', message);
    }

    public error(...message: any[]): void {
        this.log(LogLevel.ERROR, 'error', message);
    }

}
