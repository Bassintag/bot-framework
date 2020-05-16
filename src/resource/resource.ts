import {Column, IsUUID, Model, PrimaryKey} from 'sequelize-typescript';
import {UUID, UUIDV4} from 'sequelize';

export class Resource<T> extends Model<T> {

    @IsUUID(4)
    @PrimaryKey
    @Column({
        allowNull: false,
        type: UUID,
        defaultValue: UUIDV4,
    })
    id?: string;

}
