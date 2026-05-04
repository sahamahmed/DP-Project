import { Test, TestingModule } from '@nestjs/testing';
import { GroqQueueService } from './groq-queue.service';

describe('GroqQueueService', () => {
  let service: GroqQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroqQueueService],
    }).compile();

    service = module.get<GroqQueueService>(GroqQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
