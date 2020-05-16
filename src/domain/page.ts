export interface IPage<T> {

    number: number;

    size: number;

    count: number;

    total: number;

    totalPages: number;

    items: T[];
}
