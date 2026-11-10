import { Injectable } from '@nestjs/common'

/** Server time. The server stamps every `*At` field; tests swap this for a fixed clock. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date()
  }
}
