// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { Auth0Config } from './auth0.config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private auth0Config: Auth0Config,
    private authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${auth0Config.domain}/.well-known/jwks.json`,
      }),
      audience: auth0Config.audience,
      issuer: `https://${auth0Config.domain}/`,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    // Extract email from the custom namespace
    const email = payload['https://app.plant-for-the-planet.org/email'];
    const emailVerified = payload['https://app.plant-for-the-planet.org/email_verified'];
    
    // Validate or create the user in our database
    const user = await this.authService.validateUser(payload.sub, email);
    
    // Return combined user info
    return {
      userId: payload.sub,
      email: email,
      emailVerified: emailVerified,
      permissions: payload.permissions || [],
      roles: payload.roles || [],
      dbUser: user, // Add database user to request
    };
  }
}