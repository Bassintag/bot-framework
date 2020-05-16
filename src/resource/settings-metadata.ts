import {Column, Table} from 'sequelize-typescript';
import {NamedResource} from './named-resource';
import {STRING} from 'sequelize';

@Table({
    name: {
        singular: 'SettingsMetadata',
        plural: 'SettingsMetadata',
    },
})
export class SettingsMetadata extends NamedResource<SettingsMetadata> {

    @Column({
        allowNull: false,
        type: STRING,
    })
    value!: string;

}
