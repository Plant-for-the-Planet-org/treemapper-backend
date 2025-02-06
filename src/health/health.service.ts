import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  async getHealth() {
    return { message: 'Server running', status: 200 };
  }
}
