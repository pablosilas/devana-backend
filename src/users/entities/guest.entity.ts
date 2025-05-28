import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('guests')
export class Guest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  sessionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
