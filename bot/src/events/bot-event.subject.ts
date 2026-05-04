import { Injectable, Logger } from '@nestjs/common';
import { IBotSubject } from './bot-subject.interface';
import { IBotObserver, BotEvent } from './bot-observer.interface';

@Injectable()
export class BotEventSubject implements IBotSubject {
  private readonly logger = new Logger(BotEventSubject.name);
  private readonly observers: IBotObserver[] = [];

  registerObserver(observer: IBotObserver): void {
    this.observers.push(observer);
    this.logger.log(
      `Observer registered: ${observer.constructor.name}  (total: ${this.observers.length})`,
    );
  }

  removeObserver(observer: IBotObserver): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
      this.logger.log(`Observer removed: ${observer.constructor.name}`);
    }
  }

  notifyObservers(event: BotEvent): void {
    this.logger.debug(
      `Notifying ${this.observers.length} observer(s) of event: "${event.type}"`,
    );
    for (const observer of this.observers) {
      observer.update(event);
    }
  }
}
