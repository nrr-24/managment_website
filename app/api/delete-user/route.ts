import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { uid } = await req.json();

        if (!uid || typeof uid !== 'string') {
            return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
        }

        await getAdminAuth().deleteUser(uid);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        // If the user doesn't exist in Auth, that's fine — still a success
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ success: true });
        }

        console.error('Failed to delete auth user:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: 500 }
        );
    }
}
