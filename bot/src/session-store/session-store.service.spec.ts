import { Test, TestingModule } from '@nestjs/testing';
import { SessionStoreService } from './session-store.service';

describe('SessionStoreService', () => {
  let service: SessionStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionStoreService],
    }).compile();

    service = module.get<SessionStoreService>(SessionStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
