import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { PHI_REDACT_CENSOR, PHI_REDACT_PATHS } from './phi-redaction';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        const logLevel = config.get<string>('LOG_LEVEL', 'info');

        return {
          pinoHttp: {
            level: logLevel,
            redact: {
              paths: [...PHI_REDACT_PATHS],
              censor: PHI_REDACT_CENSOR,
            },
            transport:
              nodeEnv === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'SYS:standard',
                    },
                  }
                : undefined,
            customProps: () => ({
              service: 'estetoone-api',
              environment: nodeEnv,
            }),
            autoLogging: {
              ignore: (req) => req.url?.includes('/health') ?? false,
            },
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
