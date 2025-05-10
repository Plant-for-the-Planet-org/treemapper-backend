import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { users } from '../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(private drizzleService: DrizzleService) {}

  async create(createUserDto: CreateUserDto) {
    const result = await this.drizzleService.db
      .insert(users)
      .values(createUserDto)
      .returning();
    
    return result[0];
  }

  async findAll() {
    return this.drizzleService.db.select().from(users);
  }

  async findOne(id: number) {
    const result = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return result[0];
  }
}