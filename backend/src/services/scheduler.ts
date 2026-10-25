import { getPendingDueSchedules, updateSchedule, getStreamById, addStreamLog } from '../db';
import { streamingEngine } from './streamingWorker';

class DurableScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  public start(): void {
    if (this.timer) return;
    // Check pending due schedules every 5 seconds
    this.timer = setInterval(() => this.tick(), 5000);
    this.tick();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const dueSchedules = getPendingDueSchedules();

      for (const sched of dueSchedules) {
        const stream = getStreamById(sched.streamId);
        if (!stream) continue;

        // Verify day of week if WEEKDAYS or selected days are set
        if (sched.recurrence === 'WEEKDAYS') {
          const day = new Date().getUTCDay();
          if (day === 0 || day === 6) { // 0=Sunday, 6=Saturday
            continue;
          }
        } else if (sched.recurrence === 'WEEKLY' && sched.selectedDays && sched.selectedDays.length > 0) {
          const currentDay = new Date().getUTCDay();
          if (!sched.selectedDays.includes(currentDay)) {
            continue;
          }
        }

        // Check if stream is already live to prevent duplicate processes
        if (stream.status === 'LIVE' || stream.status === 'STARTING') {
          continue;
        }

        try {
          addStreamLog({
            streamId: stream.id,
            severity: 'INFO',
            eventType: 'JOB_SCHEDULED',
            message: `Executing scheduled broadcast trigger for schedule [${sched.id}]. Stop time: ${sched.stopTime || 'Indefinite'}`
          });

          await streamingEngine.startStream(
            stream.id,
            'SYSTEM_SCHEDULER',
            sched.stopTime,
            sched.id
          );

          // Update execution timestamps
          const now = new Date().toISOString();
          let nextExecution: string | null = null;

          if (sched.recurrence === 'DAILY') {
            const next = new Date(sched.startTime);
            next.setUTCDate(next.getUTCDate() + 1);
            nextExecution = next.toISOString();
          } else if (sched.recurrence === 'ONCE') {
            // Disable one-time schedule after execution
            updateSchedule(sched.id, { enabled: false, lastExecution: now });
            continue;
          }

          updateSchedule(sched.id, {
            lastExecution: now,
            nextExecution: nextExecution || undefined
          });
        } catch (err: unknown) {
          addStreamLog({
            streamId: stream.id,
            severity: 'ERROR',
            eventType: 'JOB_FAILED',
            message: `Scheduled broadcast failed to start: ${err instanceof Error ? err.message : String(err)}`
          });
        }
      }
    } catch {
      // Scheduler error handled silently
    } finally {
      this.isProcessing = false;
    }
  }
}

export const durableScheduler = new DurableScheduler();
