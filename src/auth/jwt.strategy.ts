import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { DrizzleService } from '../database/database.service';
import { userMetadata, users } from '../../drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

interface JwtPayload {
  sub: string;
  'https://app.plant-for-the-planet.org/email': string;
  'https://app.plant-for-the-planet.org/email_verified': boolean;
  iss: string;
  aud: string[];
  iat: number;
  exp: number;
  scope: string;
  azp: string;
}

interface UserData {
  id: string;                    // Auth0 sub
  internalId: string;           // Database UUID
  email: string;
  emailVerified: boolean;
  fullName: string;             // Added from schema
  firstName: string;            // Added from schema
  lastName?: string;            // Added from schema
  status: 'active' | 'archived' | 'suspended';  // Added from schema
  roles: string[];
  permissions: string[];
  metadata: any;
  lastLoginAt?: Date;          // Added from schema
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly drizzle: DrizzleService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    const domain = configService.get<string>('AUTH0_DOMAIN');
    const audience = configService.get<string>('AUTH0_AUDIENCE');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      audience: audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<UserData> {
    try {
      const cacheKey = `user_${payload.sub}`;
      let userData = await this.cacheManager.get<UserData>(cacheKey);

      if (!userData) {
        // If not in cache, get or create user
        const user = await this.usersService.getOrCreateUserByAuth0Data({
          sub: payload.sub,
          email: payload['https://app.plant-for-the-planet.org/email'],
          emailVerified: payload['https://app.plant-for-the-planet.org/email_verified']
        });

        // Get both user metadata and user details in parallel
        const [metadata, [userDetails]] = await Promise.all([
          this.drizzle.database
            .select()
            .from(userMetadata)
            .where(eq(userMetadata.userId, user.id))
            .limit(1),
          this.drizzle.database
            .select({
              status: users.status,
              fullName: users.fullName,
              firstName: users.firstName,
              lastName: users.lastName,
              lastLoginAt: users.lastLoginAt
            })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1)
        ]);

        userData = {
          id: payload.sub,
          internalId: user.id,
          email: payload['https://app.plant-for-the-planet.org/email'],
          emailVerified: payload['https://app.plant-for-the-planet.org/email_verified'],
          fullName: userDetails.fullName,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName ?? undefined,
          status: userDetails.status,
          roles: Array.isArray(metadata?.[0]?.roles) ? metadata[0].roles : ['user'],
          permissions: [],
          metadata: metadata?.[0] || {},
          lastLoginAt: userDetails.lastLoginAt ?? undefined
        };

        // Cache for 15 minutes
        await this.cacheManager.set(
          cacheKey, 
          userData, 
          900000
        );
      }

      // Always check user status before returning
      if (userData.status !== 'active') {
        throw new Error('User account is not active');
      }

      return userData;
    } catch (error) {
      console.error('Error in JWT validation:', error);
      throw error; // Let the error handler deal with it
    }
  }
}