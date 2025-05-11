import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { users } from '../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAuth0UserDto } from './dto/create-auth0-user.dto';
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
      })
      .returning();
    
    return result[0];
  }

  async findAll() {
    return this.drizzleService.db.select().from(users);
  }

  async findOne(id: string) {
    const result = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return result[0];
  }

  async findByEmail(email: string) {
    const result = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
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
    // Check if user with this email already exists
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      // If user exists but doesn't have auth0Id, update it
      if (!existingUser.auth0Id) {
        const updatedUser = await this.drizzleService.db
          .update(users)
          .set({ auth0Id: userData.auth0Id })
          .where(eq(users.email, userData.email))
          .returning();
        
        return updatedUser[0];
      }
      return existingUser;
    }
    // Create new user
    const result = await this.drizzleService.db
      .insert(users)
      .values({
        auth0Id: userData.auth0Id,
        email: userData.email,
        authName: userData.name || userData.email.split('@')[0],
      })
      .returning();
    return result[0];
  }

  async update(id: string, updateData: Partial<Omit<typeof users.$inferInsert, 'id' | 'auth0Id' | 'createdAt' | 'updatedAt'>>) {
    const result = await this.drizzleService.db
      .update(users)
      .set({ 
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return result[0];
  }

  async updateByAuth0Id(auth0Id: string, updateData: Partial<Omit<typeof users.$inferInsert, 'id' | 'auth0Id' | 'createdAt' | 'updatedAt'>>) {
    const result = await this.drizzleService.db
      .update(users)
      .set({ 
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.auth0Id, auth0Id))
      .returning();
    
    if (result.length === 0) {
      throw new NotFoundException(`User with Auth0 ID ${auth0Id} not found`);
    }
    
    return result[0];
  }

  async remove(id: string) {
    const result = await this.drizzleService.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return { success: true, id };
  }
}