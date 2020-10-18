export interface ISettingsUnsetOptions {
	key: string;
}

export interface ISettingsGetOptions {
	key: string;

	default?: string;
}

export interface ISettingsSetOptions {
	key: string;

	value: string;
}

export type ISettingsMap = { [key: string]: string | null };
