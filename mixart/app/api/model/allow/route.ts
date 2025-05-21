import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/app/lib/mongodb/mongodb';
import User from '@/app/lib/mongodb/models/user';

const MODEL_LIMITS = {
  Free:    0,
  Muse:    1,
  Glow:    2,
  Studio:  2,
  Icon:    4,
} as const;

interface UserForLimit {
  _id: string;
  subscription: keyof typeof MODEL_LIMITS;
  modelMap?: unknown[];
}

export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
        return NextResponse.json(
        { allowed: false, message: 'userId query parameter missing' },
        { status: 400 },
        );
    }
    
    await connectMongoDB();

    const user = await User.findById(userId)
        .lean<UserForLimit>()
        .exec();

    if (!user) {
        return NextResponse.json(
        { allowed: false, message: 'User not found' },
        { status: 404 },
        );
    }

    // 3. work out the numbers
    const limit   = MODEL_LIMITS[user.subscription] ?? 0;
    const current = user.modelMap?.length ?? 0;
    const allowed = current < limit;

    return NextResponse.json({ allowed, current, limit });
}