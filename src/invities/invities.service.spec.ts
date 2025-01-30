import { Test, TestingModule } from '@nestjs/testing';
import { InvitiesService } from './invities.service';

describe('InvitiesService', () => {
  let service: InvitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvitiesService],
    }).compile();

    service = module.get<InvitiesService>(InvitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
