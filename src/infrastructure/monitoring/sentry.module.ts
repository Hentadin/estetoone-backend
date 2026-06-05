import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { sanitizeForLog } from '../logging/phi-redaction';

@Module({})
export class SentryModule {
  static forRoot(): DynamicModule {
    return {
      module: SentryModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'SENTRY_INITIALIZED',
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const dsn = config.get<string>('SENTRY_DSN');
            if (!dsn) {
              return false;
            }

            Sentry.init({
              dsn,
              environment: config.get<string>('NODE_ENV', 'development'),
              tracesSampleRate: config.get<string>('NODE_ENV') === 'production' ? 0.1 : 1.0,
              beforeSend(event) {
                if (event.request?.headers) {
                  delete event.request.headers.authorization;
                  delete event.request.headers.cookie;
                }
                if (event.request?.data && typeof event.request.data === 'object') {
                  event.request.data = sanitizeForLog(event.request.data);
                }
                return event;
              },
            });

            return true;
          },
        },
      ],
      exports: ['SENTRY_INITIALIZED'],
    };
  }
}
