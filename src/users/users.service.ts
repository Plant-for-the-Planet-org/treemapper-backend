import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { userMetadata, users } from '../../drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid4 } from 'uuid';
import slugify from 'slugify';

@Injectable()
export class UsersService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getOrCreateUserByAuth0Data({ sub, email, emailVerified }) {
    // Use a transaction to ensure data consistency
    return await this.drizzle.database.transaction(async (tx) => {
      // Try to find existing user
      const existingUser = await tx
        .select()
        .from(users)
        .where(eq(users.sub, sub))
        .limit(1);

      if (existingUser.length > 0) {
        // Update last login
        await tx
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, existingUser[0].id));

        return { user: existingUser[0], isNew: false };
      }

      // Create new user
      const [newUser] = await tx
        .insert(users)
        .values({
          id: uuid4(), // Generate UUID
          sub,
          email,
          emailVerified,
          firstName: email.split('@')[0], // Temporary name, can be updated later
          fullName: email.split('@')[0],  // Temporary name, can be updated later
          status: 'active',
          lastLoginAt: new Date()
        })
        .returning();

      // Create user metadata
      await tx.insert(userMetadata).values({
        userId: newUser.id,
        roles: ['user']
      });

      return { user: newUser, isNew: true };
    });
  }

  // Update the findOrCreateUser method similarly
  async findOrCreateUser(authUser: any) {
    try {
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
        return {
          user: existingUser[0]        };
      }

      // Create new user with default workspace in a transaction
      return await this.drizzle.database.transaction(async (tx) => {
        const newUser = {
          id: uuid4(),
          email: authUser.email,
          fullName: authUser.email.split('@')[0],
          firstName: authUser.email.split('@')[0],
          lastName: null,
          avatarUrl: null,
          emailVerified: false,
          status: 'active' as const,
          preferences: {},
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          sub: null
        };

        const [createdUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();

        return {
          user: createdUser,
          workspaces: [{
            role: 'owner'
          }]
        };
      });
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }
}