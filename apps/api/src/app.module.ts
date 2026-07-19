import { Module } from "@nestjs/common";
import { IncomingMessageProcessor } from "./agent/incoming-message.processor.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  controllers: [HealthController],
  providers: [IncomingMessageProcessor],
})
export class AppModule {}
