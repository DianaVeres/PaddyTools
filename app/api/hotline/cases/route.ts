import { NextRequest } from 'next/server';
import { forwardHotlineRequest } from '@/lib/hotline-gateway';

export async function GET(request: NextRequest) {
  return forwardHotlineRequest(request, 'cases');
}

export async function POST(request: NextRequest) {
  return forwardHotlineRequest(request, 'cases');
}
