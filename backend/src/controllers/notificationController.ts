import { pool } from '../database/db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// In-memory logs for mock notifications
export type MockNotification = {
  readonly id: string;
  readonly eventId: string;
  readonly payload: any;
  readonly receivedAt: string;
};

const mockNotificationLogs: MockNotification[] = [];

// Helper to generate simple ID
function createId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// POST /api/notifications/mock-sink
export const postMockSink = asyncHandler(async (request, response) => {
  const payload = request.body;
  const eventId = payload.eventId || 'unknown';

  const notification: MockNotification = {
    id: createId(),
    eventId,
    payload,
    receivedAt: new Date().toISOString()
  };

  mockNotificationLogs.push(notification);
  console.log(`[MockSink] Received notification for event ${eventId}:`, JSON.stringify(payload, null, 2));

  response.status(200).json({
    success: true,
    message: 'Notification received by mock sink',
    notification
  });
});

// GET /api/notifications/logs
export const getMockSinkLogs = asyncHandler(async (request, response) => {
  response.status(200).json(mockNotificationLogs);
});

// GET /api/notifications/confirm/check?eventId=...
export const getConfirmCheck = asyncHandler(async (request, response) => {
  const eventId = request.query.eventId as string;

  if (!eventId) {
    response.status(400).json({ error: 'Missing eventId query parameter' });
    return;
  }

  const result = await pool.query(
    'select status from processed_events where dedupe_key = $1',
    [eventId]
  );

  const row = result.rows[0];
  const isProcessed = row ? row.status === 'processed' : false;

  response.status(200).json({
    eventId,
    isProcessed
  });
});

// POST /api/notifications/confirm
export const postConfirm = asyncHandler(async (request, response) => {
  const { eventId, status, providerResponse } = request.body;

  if (!eventId || !status) {
    response.status(400).json({ error: 'Missing eventId or status in body' });
    return;
  }

  if (status !== 'processed' && status !== 'failed') {
    response.status(400).json({ error: "status must be either 'processed' or 'failed'" });
    return;
  }

  const result = await pool.query(
    `
      update processed_events
      set status = $1, payload = payload || $2::jsonb, processed_at = now()
      where dedupe_key = $3
      returning *
    `,
    [status, JSON.stringify({ providerResponse: providerResponse || {} }), eventId]
  );

  if (result.rows.length === 0) {
    response.status(404).json({ error: `Event with dedupe_key ${eventId} not found` });
    return;
  }

  console.log(`[NotificationController] Event ${eventId} confirmed and marked as ${status}`);

  response.status(200).json({
    success: true,
    event: result.rows[0]
  });
});

// POST /api/notifications/clear-logs (utility to clear in-memory logs for testing)
export const postClearMockLogs = asyncHandler(async (request, response) => {
  mockNotificationLogs.length = 0;
  response.status(200).json({ success: true, message: 'Mock notification logs cleared' });
});
