import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { DrizzleService } from '../database/database.service';
import { userMetadata } from '../../drizzle/schema/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly drizzle: DrizzleService
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
    // Get or create user
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

    // Return enhanced user object
    return {
      id: payload.sub,
      internalId: user.id, // Database UUID
      email: payload['https://app.plant-for-the-planet.org/email'],
      emailVerified: payload['https://app.plant-for-the-planet.org/email_verified'],
      roles: metadata?.roles || ['user'], // Use metadata roles or default
      permissions: payload.permissions || [],
      metadata: metadata || {}
    };
  }
}