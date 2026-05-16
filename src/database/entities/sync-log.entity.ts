import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Client, (client) => client.syncLogs)
  @JoinColumn()
  client!: Client;

  @Column()
  clientId!: number;

  @Column()
  status!: 'success' | 'partial' | 'failed';

  @Column({ nullable: true })
  totalItems!: number;

  @Column({ nullable: true })
  matchedProducts!: number;

  @Column({ nullable: true })
  updatedProducts!: number;

  @Column({ nullable: true })
  skippedNoChange!: number;

  @Column({ nullable: true })
  skippedNotFound!: number;

  @Column({ nullable: true })
  failedUpdates!: number;

  @Column({ nullable: true })
  startedAt!: Date;

  @Column({ nullable: true })
  finishedAt!: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string;
}
