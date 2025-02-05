import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { userMetadata, users } from '../../drizzle/schema/schema';
import { workspaces, workspaceUsers } from '../../drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid4 } from 'uuid';
import slugify from 'slugify';

@Injectable()
export class UsersService {
  constructor(private readonly drizzle: DrizzleService) {}

  private async createDefaultWorkspace(userId: string, tx: any) {
    const workspaceName = 'My Workspace';
    const workspaceSlug = slugify(workspaceName, { lower: true });

    const [workspace] = await tx
      .insert(workspaces)
      .values({
        id: uuid4(),
        name: workspaceName,
        slug: workspaceSlug,
        ownerId: userId,
        createdBy: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Add user as workspace member with owner role
    await tx
      .insert(workspaceUsers)
      .values({
        id: uuid4(),
        workspaceId: workspace.id,
        userId: userId,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return workspace;
  }

  private async getUserWorkspaces(userId: string) {
    const userWorkspaces = await this.drizzle.database
      .select({
        workspace: workspaces,
        role: workspaceUsers.role,
      })
      .from(workspaceUsers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceUsers.workspaceId))
      .where(eq(workspaceUsers.userId, userId));

    return userWorkspaces;
  }

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

      

      // Create default workspace
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          id: uuid4(),
          name: `${newUser.firstName}'s Workspace`,
          slug: slugify(`${newUser.firstName}-workspace`),
          isDefault: true,
          status: 'active',
          visibility: 'private',
          createdBy: newUser.id // This fixes your current error
        })
        .returning();

      // Create workspace user record
      await tx.insert(workspaceUsers).values({
        id: uuid4(),
        workspaceId: workspace.id,
        userId: newUser.id,
        role: 'admin'
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

        // Get user's workspaces
        const workspaces = await this.getUserWorkspaces(existingUser[0].id);

        return {
          user: existingUser[0],
          workspaces: workspaces
        };
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

        // Create default workspace
        const defaultWorkspace = await this.createDefaultWorkspace(createdUser.id, tx);

        return {
          user: createdUser,
          workspaces: [{
            workspace: defaultWorkspace,
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