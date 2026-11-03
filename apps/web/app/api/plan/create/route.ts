import {handle} from '@/lib/agent/http';
export const runtime='nodejs';
export async function POST(request:Request){return handle(request);}
