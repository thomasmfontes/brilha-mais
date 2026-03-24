import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as path from 'path';

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    
    app.enableCors();
    app.use('/public', express.static(path.join(process.cwd(), 'public')));
    
    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

// Handler para a Vercel
export default async (req: any, res: any) => {
  const server = await bootstrap();
  return server(req, res);
};

// Manter o bootstrap tradicional para rodar localmente caso necessário (npm run start:dev)
if (process.env.NODE_ENV !== 'production') {
  bootstrap().then((server) => {
    const port = process.env.PORT ?? 3000;
    server.listen(port, () => {
      console.log(`🚀 API is running on: http://localhost:${port}`);
    });
  });
}
