// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = 'https://api.useplunk.com/v1/send';
    this.apiToken = this.configService.get<string>('PLUNK_API_TOKEN') || '';
  }

  async sendEmail({
    to,
    subject,
    body,
    name,
    from,
    reply,
    subscribed = false,
    headers = {},
  }: {
    to: string | string[];
    subject: string;
    body: string;
    name?: string;
    from?: string;
    reply?: string;
    subscribed?: boolean;
    headers?: Record<string, string>;
  }) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          to,
          subject,
          body,
          name,
          from,
          reply,
          subscribed,
          headers,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Failed to send email:', error.response?.data || error.message);
      throw error;
    }
  }
}