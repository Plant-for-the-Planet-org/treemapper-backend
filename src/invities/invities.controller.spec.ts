import { Test, TestingModule } from '@nestjs/testing';
import { InvitiesController } from './invities.controller';

describe('InvitiesController', () => {
  let controller: InvitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitiesController],
    }).compile();

    controller = module.get<InvitiesController>(InvitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
