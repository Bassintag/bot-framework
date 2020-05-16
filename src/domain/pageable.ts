import {IFilters} from './filter';

export interface IPageable {

    page: number;

    size: number;

    sort?: string;
}

export interface IFilteredPageable extends IPageable {

    filters?: IFilters;
}
