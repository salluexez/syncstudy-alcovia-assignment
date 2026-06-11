import { config } from '../config.js';
import { pool } from '../database/db.js';

export class N8nService {
  private isProcessingQueue = false;

  public async triggerFocusSuccess(eventId: string): Promise<void> {
    // 1. Fetch the event
    const eventRes = await pool.query(
      'select * from processed_events where dedupe_key = $1',
      [eventId]
    );
    const event = eventRes.rows[0];
    if (!event) {
      console.warn(`[N8nService] Event not found for dedupe_key: ${eventId}`);
      return;
    }

    // If already processed, don't trigger n8n again
    if (event.status === 'processed') {
      return;
    }

    try {
      console.log(`[N8nService] Dispatching webhook to n8n for event ${eventId}`);
      
      const payload = {
        eventId: event.dedupe_key,
        sessionId: event.source_entity_id,
        studentId: event.student_id,
        streak: event.payload.streak,
        coins: event.payload.coins,
        message: event.payload.message
      };

      const response = await fetch(config.n8nFocusSuccessWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`n8n responded with status ${response.status}`);
      }

      console.log(`[N8nService] Webhook successfully dispatched to n8n for event ${eventId}`);
    } catch (error: any) {
      console.error(`[N8nService] Failed to dispatch webhook to n8n for event ${eventId}:`, error);
      // Update status to failed so it can be retried later
      await pool.query(
        "update processed_events set status = 'failed' where dedupe_key = $1 and status = 'pending'",
        [eventId]
      );
    }
  }

  public async processPendingEvents(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }
    this.isProcessingQueue = true;

    try {
      // Find all pending or failed events (retry failed ones too)
      const eventsRes = await pool.query(
        "select dedupe_key from processed_events where status in ('pending', 'failed') order by created_at asc limit 50"
      );

      for (const row of eventsRes.rows) {
        await this.triggerFocusSuccess(row.dedupe_key);
      }
    } catch (err) {
      console.error('[N8nService] Error processing pending events queue:', err);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  public startQueueWorker(intervalMs = 30000): void {
    setInterval(() => {
      void this.processPendingEvents();
    }, intervalMs);
    // Also run once immediately on startup
    setTimeout(() => {
      void this.processPendingEvents();
    }, 1000);
  }
}

export const n8nService = new N8nService();
