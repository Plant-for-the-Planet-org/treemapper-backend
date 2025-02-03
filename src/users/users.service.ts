import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { userMetadata, users } from '../../drizzle/schema/schema';
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

  async getOrCreateUserByAuth0Data(auth0Data: {
    sub: string;
    email: string;
    emailVerified: boolean;
  }) {

    // Try to find existing user
    const existingUser = await this.drizzle.database
      .select()
      .from(users)
      .where(eq(users.email, auth0Data.email))
      .limit(1);

    if (existingUser.length > 0) {
      return existingUser[0];
    }

    // Create new user and metadata in a transaction
    return await this.drizzle.database.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          id: uuidv4(),
          email: auth0Data.email,
          fullName: auth0Data.email.split('@')[0], // Or get from Auth0 profile
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create default metadata
      await tx
        .insert(userMetadata)
        .values({
          userId: newUser.id,
          roles: ['user'],
          lastLogin: new Date(),
          updatedAt: new Date(),
        });

      return newUser;
    });
  }
}