import {ResourceController} from './resource-controller';
import {NamedResource} from '../resource/named-resource';
import {ISearchQuery} from '../domain/search-query';
import {IPage} from '../domain/page';
import {injectable} from 'inversify';
import {FilterOperation} from '../domain/filter';

@injectable()
export class NamedResourceController<T extends NamedResource<any>> extends ResourceController<T> {

    public async search(query: ISearchQuery): Promise<IPage<object>> {
        const page = await this.service.getPage(query, {
            'name': {
                operation: FilterOperation.INCLUDE,
                value: query.query,
            },
        });
        return {...page, items: page.items.map((i: T) => i.toJSON())};
    }

    async init(): Promise<void> {
        this.methodBinder.registerMethod<ISearchQuery>(`${this.path}/search`, (p) => this.search(p));
        super.init();
    }
}
