import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { ConfigService } from "@nestjs/config";
import { BehaviorSubject } from "rxjs";

@Injectable()
export class AppService implements OnModuleInit {

  constructor(private config: ConfigService) {
  }
  private pool: Pool;
  private readonly podId =  this.config.get<string>('POD_ID') ?? `pod-${Math.random().toString(36).substring(2, 15)}`;
  private isLeaderSubject = new BehaviorSubject<boolean>(false);

  get isLeader$() {
    return this.isLeaderSubject.asObservable();
  }

  async onModuleInit() {
    this.pool = new Pool({
      host: this.config.get<string>('DB_HOST') ?? 'localhost',
      port: this.config.get<string>('DB_PORT') ? +this.config.get<string>('DB_PORT'): 5432,
      user: this.config.get<string>('DB_USER') ?? 'postgres',
      password: this.config.get<string>('DB_PASSWORD') ?? 'password',
      database: this.config.get<string>('DB_NAME') ?? 'leader_election',
    });
    console.log("Check process env", process.env.POD_ID);
    console.log("Check config module", this.config.get<string>('POD_ID'));
  }

  @Cron('*/5 * * * * *') // Runs every 5 seconds
  async electLeader() {
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);

    try {
      await this.pool.query('SELECT pg_advisory_lock(1)');
      const result = await this.pool.query(
        `UPDATE leader_election
         SET leader_id = $1, last_update_time = $2
         WHERE (leader_id IS NULL OR last_update_time < $3)
         RETURNING leader_id`,
        [this.podId, now, tenSecondsAgo],
      );
      const isLeader = result.rowCount > 0;
      this.isLeaderSubject.next(isLeader);

      if (isLeader) {
        console.log('I am the leader: Hello World '+ this.podId);
      }
    } catch (err) {
      console.error('Error during leader election:', err.message);
    }
  }
}
