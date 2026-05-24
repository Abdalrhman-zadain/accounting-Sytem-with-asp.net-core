import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend integration
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      console.log('Incoming request from origin:', origin);
      // Allow all origins for now or reflect the request origin
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Simple Account API')
    .setDescription('The API documentation for Simple Account ERP system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3007;
  try {
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}/api`);
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 'EADDRINUSE') {
      logger.error(
        `Port ${port} is already in use. The ERP backend is likely already running in another terminal. Stop the existing process or use a different PORT before starting a new instance.`,
      );
      await app.close();
      process.exit(1);
    }

    throw error;
  }
}

bootstrap();
