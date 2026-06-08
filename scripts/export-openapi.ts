import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { stringify } from 'yaml';
import { AppModule } from '../src/app.module';
import { buildSwaggerDocument } from '../src/config/swagger.config';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });
  const apiPrefix = process.env.API_PREFIX ?? 'v1';

  app.use(cookieParser());
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const document = buildSwaggerDocument(app);
  const outputDir = join(process.cwd(), 'docs');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'openapi.json'), JSON.stringify(document, null, 2));
  writeFileSync(join(outputDir, 'openapi.yaml'), stringify(document));

  await app.close();
  // eslint-disable-next-line no-console
  console.log(`Exported OpenAPI spec to ${outputDir}/openapi.yaml`);
}

exportOpenApi().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
