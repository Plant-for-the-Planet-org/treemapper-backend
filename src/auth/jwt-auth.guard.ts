import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Add debugging logs
    console.log('Auth Error:', err);
    console.log('User:', user);
    console.log('Info:', info);
    console.log('Headers:', context.switchToHttp().getRequest().headers);

    // If there's an error or no user, throw an error
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token or no token provided');
    }

    return user;
  }
}