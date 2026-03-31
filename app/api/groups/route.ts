import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const groups = await prisma.group.findMany({
      where: { sessionId: sessionId },
      select: {
        whatsappGroupJid: true,
        slug: true,
        name: true,
        imageUrl: true,
        lastInteraction: true,
        updatedAt: true
      },
      orderBy: [
        { lastInteraction: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    const mappedGroups = groups.map((g) => ({
      id: g.slug,
      jid: g.whatsappGroupJid,
      name: g.name || g.slug,
      imageUrl: g.imageUrl
    }));

    return NextResponse.json(mappedGroups);
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return NextResponse.json([{ jid: "120363397396984666@g.us", name: "Target Network (Fallback)" }]);
  }
}
