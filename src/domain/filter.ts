export enum FilterOperation {
	EQUAL = 'eq',
	NOT_EQUAL = 'ne',
	IN = 'in',
	NOT_IN = 'ni',
}

export type ISingleValueFilterValue = string | number;
export type IMultipleValuesFilterValue = ISingleValueFilterValue | ISingleValueFilterValue[];

export interface ISingleValueFilter {
	operation: FilterOperation.EQUAL | FilterOperation.NOT_EQUAL;

	value: ISingleValueFilterValue | undefined;
}

export interface IMultiValueFilter {
	operation: FilterOperation.IN | FilterOperation.NOT_IN;

	value: IMultipleValuesFilterValue;
}

export type IFilter = ISingleValueFilter | IMultiValueFilter | string | null;

export interface IFilters {
	[key: string]: IFilter;
}
