export enum FilterOperation {
    EQUAL = 'eq',
    NOT_EQUAL = 'ne',
    INCLUDE = 'in',
    NOT_INCLUDE = 'ni',
}

export type ISingleValueFilterValue = string | number;
export type IMultipleValuesFilterValue = ISingleValueFilterValue | ISingleValueFilterValue[];

export interface ISingleValueFilter {

    operation: FilterOperation.EQUAL | FilterOperation.NOT_EQUAL;

    value: ISingleValueFilterValue | undefined;
}

export interface IMultiValueFilter {

    operation: FilterOperation.INCLUDE | FilterOperation.NOT_INCLUDE;

    value: IMultipleValuesFilterValue;
}

export type IFilter = ISingleValueFilter | IMultiValueFilter;

export interface IFilters {

    [key: string]: IFilter,
}
