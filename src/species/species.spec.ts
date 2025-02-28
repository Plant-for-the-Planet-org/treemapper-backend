import { Test, TestingModule } from '@nestjs/testing';
import { Species } from './species';

describe('Species', () => {
  let provider: Species;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Species],
    }).compile();

    provider = module.get<Species>(Species);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
