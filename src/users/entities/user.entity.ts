import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  FULLSTACK = 'fullstack',
  MOBILE = 'mobile',
  DEVOPS = 'devops',
  UI_UX = 'ui-ux',
  DATA = 'data',
  QA = 'qa',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.FRONTEND,
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
