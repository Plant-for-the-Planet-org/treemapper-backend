import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { users } from '../../drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findOrCreateUser(authUser: any) {
    try {
      // Find existing user
      const existingUser = await this.drizzle.database
        .select()
        .from(users)
        .where(eq(users.email, authUser.email))
        .limit(1);

      if (existingUser.length > 0) {
        return existingUser[0];
      }

      // Create new user if not found
      const newUser = {
        id: uuidv4(), // Generate new UUID
        email: authUser.email,
        fullName: authUser.email.split('@')[0],
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdUser] = await this.drizzle.database
        .insert(users)
        .values(newUser)
        .returning();

      return createdUser;
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  async getUsers() {
    return this.drizzle.database
      .select()
      .from(users);
  }
}