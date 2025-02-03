import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { DrizzleService } from '../database/database.service';
import { userMetadata } from '../../drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly drizzle: DrizzleService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache & { set: (key: string, value: any, options?: any) => Promise<void>; get: (key: string) => Promise<any> }
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

  async validate(payload: any) {
    try {
      // Try to get from cache first
      const cacheKey = `user_${payload.sub}`;
      let userData = await this.cacheManager.get(cacheKey);

      if (!userData) {
        // If not in cache, get or create user
        const user = await this.usersService.getOrCreateUserByAuth0Data({
          sub: payload.sub,
          email: payload['https://app.plant-for-the-planet.org/email'],
          emailVerified: payload['https://app.plant-for-the-planet.org/email_verified']
        });

        // Get user metadata
        const [metadata] = await this.drizzle.database
          .select()
          .from(userMetadata)
          .where(eq(userMetadata.userId, user.id))
          .limit(1);

        // Create user data object
        userData = {
          id: payload.sub,
          internalId: user.id,
          email: payload['https://app.plant-for-the-planet.org/email'],
          emailVerified: payload['https://app.plant-for-the-planet.org/email_verified'],
          roles: metadata?.roles || ['user'],
          permissions: payload.permissions || [],
          metadata: metadata || {}
        };

        // Store in cache for 15 minutes
        await this.cacheManager.set(cacheKey, userData, 900000); // 15 minutes in milliseconds
      }

      return userData;
    } catch (error) {
      console.error('Error in JWT validation:', error);
      // If there's an error with caching, fallback to direct database query
      const user = await this.usersService.getOrCreateUserByAuth0Data({
        sub: payload.sub,
        email: payload['https://app.plant-for-the-planet.org/email'],
        emailVerified: payload['https://app.plant-for-the-planet.org/email_verified']
      });

      const [metadata] = await this.drizzle.database
        .select()
        .from(userMetadata)
        .where(eq(userMetadata.userId, user.id))
        .limit(1);

      return {
        id: payload.sub,
        internalId: user.id,
        email: payload['https://app.plant-for-the-planet.org/email'],
        emailVerified: payload['https://app.plant-for-the-planet.org/email_verified'],
        roles: metadata?.roles || ['user'],
        permissions: payload.permissions || [],
        metadata: metadata || {}
      };
    }
  }
}