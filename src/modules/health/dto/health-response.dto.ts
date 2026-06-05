export class HealthResponseDto {
  status!: 'ok' | 'degraded';
  db!: 'up' | 'down';
  redis!: 'up' | 'down';
  timestamp!: string;
}
