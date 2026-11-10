import { Global, Module } from '@nestjs/common'
import { Clock } from './clock'

/** Small shared providers. Guards, pipes and the error filter are wired in AppModule. */
@Global()
@Module({ providers: [Clock], exports: [Clock] })
export class CommonModule {}
