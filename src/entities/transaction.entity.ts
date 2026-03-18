import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: ['FUNDING', 'CONVERSION', 'TRADE'] })
  type: 'FUNDING' | 'CONVERSION' | 'TRADE';

  @Column({ name: 'source_currency', length: 3, nullable: true })
  sourceCurrency: string;

  @Column({ name: 'target_currency', length: 3, nullable: true })
  targetCurrency: string;

  @Column({
    name: 'source_amount',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  sourceAmount: number;

  @Column({
    name: 'target_amount',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  targetAmount: number;

  @Column({
    name: 'fx_rate',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  fxRate: number;

  @Column({ type: 'enum', enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' })
  status: 'SUCCESS' | 'FAILED';

  @Column({ name: 'idempotency_key', length: 64, unique: true, nullable: true })
  idempotencyKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
