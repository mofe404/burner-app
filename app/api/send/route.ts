import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addMessageToQueue } from '@/lib/queue';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, groupSlug, mediaUrl, mediaType } = body;

    if ((!message && !mediaUrl) || !groupSlug) {
      return NextResponse.json({ error: 'Missing required payload' }, { status: 400 });
    }

    console.log(`[Burner] Attempting send to group slug: ${groupSlug}`);
    const decodedSlug = decodeURIComponent(groupSlug as string);

    const group = await prisma.group.findUnique({
      where: { slug: decodedSlug },
      include: { admin: true }
    });

    if (!group) {
        return NextResponse.json({ error: 'Target target not found or session expired.' }, { status: 404 });
    }

    const senderNumber = group.sessionId || group.admin.phoneNumber;

    const newMessage = await prisma.message.create({
      data: {
        content: message || '[Media Payload Attached]',
        status: 'PENDING',
        groupId: group.id
      }
    });

    await addMessageToQueue({
      messageId: newMessage.id,
      jid: group.whatsappGroupJid,
      content: message,
      senderNumber,
      adminId: group.adminId,
      mediaUrl,
      mediaType
    });

    return NextResponse.json({ success: true, messageId: newMessage.id });
  } catch (err: unknown) {
    console.error('Failed to send message:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
