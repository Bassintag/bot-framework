import {Resource} from './resource';
import {Column} from 'sequelize-typescript';
import {STRING} from 'sequelize';

export class NamedResource<T> extends Resource<T> {

    @Column({
        allowNull: false,
        type: STRING,
    })
    name!: string;
}
