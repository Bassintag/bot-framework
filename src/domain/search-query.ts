import { IPageable } from './pageable';

export interface ISearchQuery extends IPageable {
	query: string;
}
