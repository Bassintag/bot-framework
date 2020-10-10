export interface ISettingsKey {

    displayName: string;

    key: string;

    type: 'string' | 'number' | 'boolean';

    defaultValue?: string;

    enumValues?: string[];

    meta: { [key: string]: any };
}
