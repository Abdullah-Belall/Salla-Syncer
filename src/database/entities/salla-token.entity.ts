import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('salla_tokens')
export class SallaToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Client)
  @JoinColumn()
  client!: Client;

  @Column()
  clientId!: number;

  @Column({ type: 'text' })
  accessToken!: string;

  @Column({ type: 'text' })
  refreshToken!: string;

  @Column()
  expiresAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
