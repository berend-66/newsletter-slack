import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  try {
    // Check database connectivity
    const dbStatus = db.prepare('SELECT 1 as ok').get() as { ok: number }
    
    return NextResponse.json({
      status: 'healthy',
      database: dbStatus.ok === 1 ? 'connected' : 'unknown',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}