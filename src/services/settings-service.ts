import {Repository} from 'sequelize-typescript';
import {SettingsMetadata} from '../resource/settings-metadata';
import {inject, injectable, named} from 'inversify';
import {IDENTIFIERS} from '../constants/identifiers';
import {RESOURCE_NAMES} from '../constants/resource-names';
import {ISettingsKey} from '../domain/settings-key';
import {IEventManager} from '../events/event-manager';
import {EVENTS} from '../constants/events';
import {ISettingsChangedEvent} from '../events/domain/settings-changed-event';

export interface ISettingsService {

    get(property: string, defaultValue?: string): Promise<string | null>;

    set(property: string, value: string): Promise<void>;

    remove(property: string): Promise<void>;
}

@injectable()
export class SettingsService implements ISettingsService {

    constructor(
        @inject(IDENTIFIERS.REPOSITORY)
        @named(RESOURCE_NAMES.SETTINGS_METADATA)
        private readonly $repository: Repository<SettingsMetadata>,
        @inject(IDENTIFIERS.SETTINGS_KEYS)
        private readonly $settingsKeys: ISettingsKey[],
        @inject(IDENTIFIERS.EVENT_MANAGER)
        private readonly $eventManager: IEventManager,
    ) {
    }

    private findExisting(property: string): Promise<SettingsMetadata> {
        return this.$repository.findOne({where: {'name': property}});
    }

    public async get(property: string, defaultValue?: string): Promise<string | null> {
        const existing = await this.findExisting(property);
        if (existing) {
            return existing.value;
        } else {
            return defaultValue || null;
        }
    }

    public async set(property: string, value: string): Promise<void> {
        const existing = await this.findExisting(property);
        if (existing) {
            existing.value = value;
            await existing.save();
        } else if (value != null && value.length > 0) {
            await this.$repository.create({
                name: property,
                value: value,
            });
        }
        this.$eventManager.publish(EVENTS.SETTINGS_CHANGED, {
            key: property,
            value,
        } as ISettingsChangedEvent);
    }

    public async remove(property: string): Promise<void> {
        await this.$repository.destroy({where: {'name': property}});
    }
}
