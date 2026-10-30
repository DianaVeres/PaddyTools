import { forwardToPackingList } from '@/lib/packinglist-service';

export const GET = (request: Request) => forwardToPackingList(request);
