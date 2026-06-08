import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';
export const SWAGGER_JSON_PATH = 'api/docs-json';

export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const port = process.env.PORT ?? 3000;

  const config = new DocumentBuilder()
    .setTitle('EstetoOne API')
    .setDescription(
      'REST API for EstetoOne (telehealth platform). All routes are prefixed with `/v1` unless noted. ' +
        'Authenticate with Bearer JWT; refresh tokens are issued as HttpOnly `refresh_token` cookies.',
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}/${apiPrefix}`, 'Local development')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
      description: 'HttpOnly refresh token cookie (login/register/refresh)',
    })
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'stripe-signature' },
      'stripe-signature',
    )
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
  });
}

export function setupSwagger(app: INestApplication): OpenAPIObject {
  const document = buildSwaggerDocument(app);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'EstetoOne API Docs',
  });

  return document;
}
