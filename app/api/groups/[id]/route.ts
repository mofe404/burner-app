import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slug } = await params;
    const decodedSlug = decodeURIComponent(slug as string);
    
    if (!decodedSlug) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { slug: decodedSlug },
      select: {
        name: true,
        imageUrl: true,
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Failed to fetch group metadata:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
