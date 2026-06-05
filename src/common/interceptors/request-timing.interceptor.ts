import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export const RESPONSE_TIME_HEADER = 'X-Response-Time-Ms';
export const SLOW_REQUEST_THRESHOLD_MS = 500;

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const response = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        response.setHeader(RESPONSE_TIME_HEADER, String(durationMs));
      }),
    );
  }
}
