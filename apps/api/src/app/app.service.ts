import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData() {
    return { message: 'Welcome to the Question Generator Platform API!' };
  }
}
