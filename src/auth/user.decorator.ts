// src/auth/user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If data (key) is passed, return the specific property
    if (data) {
      // For Auth0 ID, remove the 'auth0|' prefix if it exists
      if (data === 'id' && user.id && user.id.startsWith('auth0|')) {
        return user.id.replace('auth0|', '');
      }
      return user[data];
    }

    // Return the whole user object if no specific property is requested
    return user;
  },
);