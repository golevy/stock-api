import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

const server: Express = express();

async function bootstrap() {
  const logger = new Logger();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  const port = parseInt(process.env.PORT, 10) || 3000;
  const env = process.env.NODE_ENV || 'development';

  app.enableCors();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    await app.listen(port);
    logger.log(`=================================`);
    logger.log(`======= ENV: ${env} =======`);
    logger.log(`🚀 Application listening on port ${port}`);
    logger.log(`=================================`);
  } else {
    await app.init();
  }
}

bootstrap();

export default server;
