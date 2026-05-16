import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { SallaToken } from './salla-token.entity';
import { SyncLog } from './sync-log.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  apiKey!: string;

  @Column({ unique: true })
  sallaMerchantId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToOne(() => SallaToken, (token) => token.client)
  token!: SallaToken;

  @OneToMany(() => SyncLog, (log) => log.client)
  syncLogs!: SyncLog[];
}
