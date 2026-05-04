import { IBotObserver } from './bot-observer.interface';

export interface IBotSubject {
  registerObserver(observer: IBotObserver): void;
  removeObserver(observer: IBotObserver): void;
  notifyObservers(event: import('./bot-observer.interface').BotEvent): void;
}
