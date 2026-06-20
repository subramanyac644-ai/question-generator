import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS since frontends run on different ports
  app.enableCors();

  // Serve uploads directory statically at /uploads using NestJS built-in method
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Enable global validation pipe with class-validator settings
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Configure Swagger OpenAPI specification
  const config = new DocumentBuilder()
    .setTitle('Question Generator API')
    .setDescription('Backend REST service endpoints for Question Generator Platform')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  let port = process.env.PORT || 5000;
  if (port === '3000' || port === '3001') {
    port = 5000;
  }
  await app.listen(port);
  Logger.log(`🚀 API Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📖 Swagger API documentation is available at: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
