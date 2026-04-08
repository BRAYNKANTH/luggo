import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  if (body?.action === 'mark_all_read') {
    const { error } = await (supabase.from('notifications') as never)
      .update({ read: true })
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (!body?.id) {
    return NextResponse.json({ error: 'Notification id required' }, { status: 400 })
  }

  const { error } = await (supabase.from('notifications') as never)
    .update({ read: true })
    .eq('id', body.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  if (!body?.id) {
    return NextResponse.json({ error: 'Notification id required' }, { status: 400 })
  }

  const { error } = await (supabase.from('notifications') as never)
    .delete()
    .eq('id', body.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
