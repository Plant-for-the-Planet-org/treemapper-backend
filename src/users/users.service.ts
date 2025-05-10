import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { users } from '../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAuth0UserDto } from './dto/create-auth0-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(private drizzleService: DrizzleService) {}

  async create(createUserDto: CreateUserDto) {
    const result = await this.drizzleService.db
      .insert(users)
      .values({
        auth0Id: createUserDto.auth0Id,
        email: createUserDto.email,
        name: createUserDto.name || createUserDto.email.split('@')[0],
        role: createUserDto.role as any || 'viewer', // Default role
      })
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

  // Auth0 related methods
  async findByAuth0Id(auth0Id: string) {
    const result = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.auth0Id, auth0Id));
    
    return result[0];
  }

  async createFromAuth0(userData: CreateAuth0UserDto) {
    const result = await this.drizzleService.db
      .insert(users)
      .values({
        auth0Id: userData.auth0Id,
        email: userData.email,
        name: userData.name || userData.email.split('@')[0],
        role: userData.role as any || 'viewer', // Default role
      })
      .returning();
    
    return result[0];
  }

  async updateRole(auth0Id: string, updateRoleDto: UpdateRoleDto) {
    const result = await this.drizzleService.db
      .update(users)
      .set({ role: updateRoleDto.role as any })
      .where(eq(users.auth0Id, auth0Id))
      .returning();
    
    return result[0];
  }
}