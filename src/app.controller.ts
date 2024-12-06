import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    this.appService.isLeader$.subscribe((isLeader) => {
      console.log('Leader status changed:', isLeader);
    });
    return this.appService.electLeader();
  }
}
