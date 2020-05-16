import {IController} from './controller';
import {inject, injectable} from 'inversify';
import {ISettingsService} from '../services/settings-service';
import {IDENTIFIERS} from '../constants/identifiers';
import {ISettingsGetOptions, ISettingsMap, ISettingsSetOptions, ISettingsUnsetOptions} from '../domain/settings';
import {IMethodBinder} from './method-binder';
import {ISettingsKey} from '../domain/settings-key';
import {InvalidSettingsKeyError} from '../errors/invalid-settings-key-error';

@injectable()
export class SettingsController implements IController {

    private readonly $keyMap: { [key: string]: ISettingsKey };

    constructor(
        @inject(IDENTIFIERS.SETTINGS_SERVICE)
        private readonly $settingsService: ISettingsService,
        @inject(IDENTIFIERS.METHOD_BINDER)
        private readonly $methodBinder: IMethodBinder,
        @inject(IDENTIFIERS.SETTINGS_KEYS)
        private readonly $settingsKeys: ISettingsKey[],
    ) {
        this.$keyMap = {};
        for (const sk of $settingsKeys) {
            this.$keyMap[sk.key] = sk;
        }
        console.log(this.$keyMap);
    }

    public async getKeys(): Promise<ISettingsKey[]> {
        return this.$settingsKeys;
    }

    public get(options: ISettingsGetOptions): Promise<string | null> {
        if (this.$keyMap[options.key] == null) {
            throw new InvalidSettingsKeyError('Invalid settings key: ' + options.key);
        }
        return this.$settingsService.get(options.key, options.default);
    }

    public async getAll(): Promise<ISettingsMap> {
        const map: ISettingsMap = {};
        for (const key of this.$settingsKeys) {
            map[key.key] = await this.$settingsService.get(key.key);
        }
        return map;
    }

    public set(options: ISettingsSetOptions): Promise<void> {
        if (this.$keyMap[options.key] == null) {
            throw new InvalidSettingsKeyError('Invalid settings key: ' + options.key);
        }
        return this.$settingsService.set(options.key, options.value);
    }

    public async setAll(options: ISettingsMap): Promise<void> {
        const keys = Object.keys(options);
        for (const key of keys) {
            const value = options[key];
            if (value == null || value.length == 0) {
                await this.unset({key})
            } else {
                await this.set({key, value});
            }
        }
    }

    public unset(options: ISettingsUnsetOptions): Promise<void> {
        if (this.$keyMap[options.key] == null) {
            throw new InvalidSettingsKeyError('Invalid settings key: ' + options.key);
        }
        return this.$settingsService.remove(options.key);
    }

    public async init(): Promise<void> {
        this.$methodBinder.registerMethod<void>('settings/getKeys', () => this.getKeys());
        this.$methodBinder.registerMethod<ISettingsGetOptions>('settings/get', (p) => this.get(p));
        this.$methodBinder.registerMethod<ISettingsGetOptions>('settings/getAll', () => this.getAll());
        this.$methodBinder.registerMethod<ISettingsSetOptions>('settings/set', (p) => this.set(p));
        this.$methodBinder.registerMethod<ISettingsMap>('settings/setAll', (p) => this.setAll(p));
        this.$methodBinder.registerMethod<ISettingsUnsetOptions>('settings/unset', (p) => this.unset(p));
    }

}
