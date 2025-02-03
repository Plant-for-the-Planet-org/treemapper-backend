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
        // Update last login time
        await this.drizzle.database
          .update(users)
          .set({ 
            lastLoginAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUser[0].id));

        return existingUser[0];
      }

      // Create new user if not found
      const newUser = {
        id: uuidv4(),
        email: authUser.email,
        fullName: authUser.email.split('@')[0], // Consider getting from auth profile
        firstName: authUser.email.split('@')[0], // Required field in new schema
        lastName: null,
        avatarUrl: null,
        emailVerified: false, // New required field
        status: 'active' as const, // New required field
        preferences: {},
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        sub: null // Auth0 specific field
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
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        firstName: users.firstName,
        lastName: users.lastName,
        status: users.status,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.status, 'active'));
  }

  async getOrCreateUserByAuth0Data(auth0Data: {
    sub: string;
    email: string;
    emailVerified: boolean;
    given_name?: string;
    family_name?: string;
    name?: string;
  }) {
    // Try to find existing user
    const existingUser = await this.drizzle.database
      .select()
      .from(users)
      .where(eq(users.email, auth0Data.email))
      .limit(1);

    if (existingUser.length > 0) {
      // Update last login and Auth0 data
      await this.drizzle.database
        .update(users)
        .set({ 
          lastLoginAt: new Date(),
          updatedAt: new Date(),
          emailVerified: auth0Data.emailVerified,
          sub: auth0Data.sub
        })
        .where(eq(users.id, existingUser[0].id));

      return existingUser[0];
    }

    // Create new user and metadata in a transaction
    return await this.drizzle.database.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          id: uuidv4(),
          email: auth0Data.email,
          fullName: auth0Data.name || auth0Data.email.split('@')[0],
          firstName: auth0Data.given_name || auth0Data.email.split('@')[0],
          lastName: auth0Data.family_name || null,
          emailVerified: auth0Data.emailVerified,
          status: 'active',
          preferences: {},
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          sub: auth0Data.sub
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

  // New helper method for updating user last login
  private async updateUserLastLogin(userId: string) {
    await this.drizzle.database
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
}