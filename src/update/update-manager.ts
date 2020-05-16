import {BehaviorSubject, fromEvent} from 'rxjs';
import {inject, injectable} from 'inversify';
import {IUpdateStatus, IUpdateStatusType} from './domain/update-status';
import {autoUpdater} from 'electron-updater';
import {IEventManager} from '../events/event-manager';
import {IDENTIFIERS} from '../constants/identifiers';
import {EVENTS} from '../constants/events';

export interface IUpdateManager {

    readonly status: IUpdateStatus;

    checkForUpdate(): void;

    install(): void;
}

@injectable()
export class UpdateManager implements IUpdateManager {

    private readonly $statusSubject: BehaviorSubject<IUpdateStatus>;

    get status(): IUpdateStatus {
        return this.$statusSubject.value;
    }

    constructor(
        @inject(IDENTIFIERS.EVENT_MANAGER)
        private readonly $eventManager: IEventManager,
    ) {
        this.$statusSubject = new BehaviorSubject<IUpdateStatus>({
            type: IUpdateStatusType.IDLE,
            message: 'Up to date',
        });
        this.$statusSubject.subscribe((status) => {
            this.$eventManager.publish(EVENTS.UPDATE_STATUS_CHANGED, status);
        });
        fromEvent(autoUpdater, 'error').subscribe(() => this.$statusSubject.next({
            type: IUpdateStatusType.IDLE,
            message: 'Error while checking for update',
        }));
        fromEvent(autoUpdater, 'checking-for-update').subscribe(() => this.$statusSubject.next({
            type: IUpdateStatusType.PROCESSING,
            message: 'Checking for update',
        }));
        fromEvent(autoUpdater, 'update-available').subscribe(() => this.$statusSubject.next({
            type: IUpdateStatusType.PROCESSING,
            message: 'Downloading update',
        }));
        fromEvent(autoUpdater, 'update-not-available').subscribe(() => this.$statusSubject.next({
            type: IUpdateStatusType.IDLE,
            message: 'Up to date',
        }));
        fromEvent(autoUpdater, 'update-downloaded').subscribe(() => this.$statusSubject.next({
            type: IUpdateStatusType.READY,
            message: 'Update ready',
        }));
    }

    public async checkForUpdate() {
        return autoUpdater.checkForUpdates();
    }

    public install() {
        autoUpdater.quitAndInstall();
    }
}
