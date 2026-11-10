import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { AlarmsModule } from './alarms/alarms.module'
import { AssistantModule } from './assistant/assistant.module'
import { AuthModule } from './auth/auth.module'
import { ChecksModule } from './checks/checks.module'
import { AuthGuard } from './common/auth/auth.guard'
import { CommonModule } from './common/common.module'
import { ErrorFilter } from './common/filters/error.filter'
import { env } from './config/env'
import { ConfigSetsModule } from './config/config-sets.module'
import { ConsentsModule } from './consents/consents.module'
import { DevicesModule } from './devices/devices.module'
import { DrawingsModule } from './drawings/drawings.module'
import { EventsModule } from './events/events.module'
import { FirebaseModule } from './firebase/firebase.module'
import { FormsModule } from './forms/forms.module'
import { HealthModule } from './health/health.module'
import { PainChecksModule } from './pain-checks/pain-checks.module'
import { QuestionsModule } from './questions/questions.module'
import { RepliesModule } from './replies/replies.module'
import { StaffModule } from './staff/staff.module'
import { VisitsModule } from './visits/visits.module'

@Module({
  imports: [
    /**
     * Structured logs. Bodies are never logged (pino-http doesn't by default); the redact list is a
     * second line of defence. TODO(B.1): add `customProps` with deviceId/uid/ward from req.principal,
     * and a test that a request containing `en`, `text` and Authorization logs none of them.
     */
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body', 'res.body'], censor: '[redacted]' },
        ...(env.NODE_ENV === 'test' && { enabled: false }),
      },
    }),
    FirebaseModule,
    CommonModule,
    HealthModule,
    AuthModule,
    DevicesModule,
    StaffModule,
    ConfigSetsModule,
    VisitsModule,
    EventsModule,
    RepliesModule,
    QuestionsModule,
    ChecksModule,
    AlarmsModule,
    DrawingsModule,
    ConsentsModule,
    // Reserved slots, empty until their plans start:
    AssistantModule, // plan 01
    FormsModule, // plan 01
    PainChecksModule, // plan 03
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: ErrorFilter },
  ],
})
export class AppModule {}
