import { Module } from '@nestjs/common';
import { TreeService } from './trees.service';
import { TreeController } from './trees.controller';
import { DatabaseModule } from '../database/database.module';


@Module({
  imports: [DatabaseModule],  // This should be present
  controllers: [TreeController],
  providers: [TreeService],
  exports: [TreeService],
})
export class TreeModule { }