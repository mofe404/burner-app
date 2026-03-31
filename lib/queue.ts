import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Construct RESP URL dynamically from Upstash REST variables as requested
const upstashHost = (process.env.UPSTASH_REDIS_REST_URL || '').replace('https://', '');
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const connection = new Redis(`rediss://default:${upstashToken}@${upstashHost}:6379`, {
    maxRetriesPerRequest: null
});
export const messageQueue = new Queue('whatsapp-outbound', { connection });

export async function addMessageToQueue(data: {
  messageId: string;
  jid: string;
  content: string;
  senderNumber: string;
  adminId: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}) {
  // Add to BullMQ
  await messageQueue.add('send-message', data);
}
