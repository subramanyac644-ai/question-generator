import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenRouterService } from './openrouter.service';
import { GenerationOrchestratorService } from './generation-orchestrator.service';

@Module({
  imports: [ConfigModule],
  providers: [OpenRouterService, GenerationOrchestratorService],
  exports: [OpenRouterService, GenerationOrchestratorService],
})
export class AiGeneratorModule {}
