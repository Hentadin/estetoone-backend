import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import {
  RequestTimingInterceptor,
  RESPONSE_TIME_HEADER,
  SLOW_REQUEST_THRESHOLD_MS,
} from '../../src/common/interceptors/request-timing.interceptor';

describe('RequestTimingInterceptor', () => {
  const interceptor = new RequestTimingInterceptor();

  it('sets X-Response-Time-Ms header on successful requests', (done) => {
    const headers: Record<string, string> = {};
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: (name: string, value: string) => {
            headers[name] = value;
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of({ ok: true }),
    };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(headers[RESPONSE_TIME_HEADER]).toBeDefined();
        expect(Number(headers[RESPONSE_TIME_HEADER])).toBeGreaterThanOrEqual(0);
        done();
      },
    });
  });

  it('exports slow request threshold for monitoring baseline', () => {
    expect(SLOW_REQUEST_THRESHOLD_MS).toBe(500);
    expect(RESPONSE_TIME_HEADER).toBe('X-Response-Time-Ms');
  });
});
