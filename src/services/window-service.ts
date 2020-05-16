import {app, BrowserWindow, BrowserWindowConstructorOptions} from 'electron';
import {inject, injectable} from 'inversify';
import {IDENTIFIERS} from '../constants/identifiers';
import {fromEvent, ReplaySubject, Subject} from 'rxjs';
import {take} from 'rxjs/operators';

export interface IOpenWindowOptions {

    path: string;

    windowOptions?: BrowserWindowConstructorOptions;
}

export interface IWindowService {

    openWindow(options: IOpenWindowOptions): Promise<BrowserWindow>;
}

@injectable()
export class WindowService implements IWindowService {

    private readonly $onReady: Subject<void>;

    constructor(
        @inject(IDENTIFIERS.DEBUG)
        private readonly $debug: boolean,
    ) {
        this.$onReady = new ReplaySubject<void>();
        fromEvent<void>(app as any, 'ready').subscribe(() => this.$onReady.next());
    }

    public async openWindow(options: IOpenWindowOptions): Promise<BrowserWindow> {
        await this.$onReady.pipe(
            take(1)
        ).toPromise();
        const window = new BrowserWindow(options.windowOptions || {
            autoHideMenuBar: true,
            show: false,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
            }
        });
        if (this.$debug) {
            window.webContents.openDevTools({mode: 'detach'});
        }
        window.loadFile(options.path).then(() => window.show());
        return window;
    }

}
