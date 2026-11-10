import { Module } from '@nestjs/common'
import { CommonModule } from '../common/common.module'
import { DrawingsModule } from '../drawings/drawings.module'
import { FirebaseModule } from '../firebase/firebase.module'
import { RetentionService } from './retention.service'

/** Standalone: the Cloud Run job boots only this module, not the HTTP app. */
@Module({
  imports: [FirebaseModule, CommonModule, DrawingsModule],
  providers: [RetentionService],
})
export class RetentionModule {}
