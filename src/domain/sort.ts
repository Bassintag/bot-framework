export enum SortDirection {
	ASC = 'ASC',
	DESC = 'DESC',
}

export interface ISort {
	value: string;

	direction?: SortDirection;
}
