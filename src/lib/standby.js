import { supabase } from './supabase.js'
import { consumeSessionForBooking } from './subscriptions.js'
import { memberIdByEmail } from './members.js'

export async function promoteStandby(cancelledBooking) {
  const { booking_date, booking_time, service } = cancelledBooking

  const { data: standbys } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', booking_date)
    .eq('booking_time', booking_time)
    .eq('service', service)
    .eq('status', 'standby')
    .order('created_at', { ascending: true })
    .limit(1)

  if (!standbys || standbys.length === 0) return

  const standby = standbys[0]

  // If the booking already has a subscription_id (e.g. from a future admin flow
  // where the session was pre-consumed), don't consume a second one.
  let subscriptionId = standby.subscription_id || null

  if (!subscriptionId) {
    const memberId = await memberIdByEmail(standby.email)
    if (memberId) {
      const consume = await consumeSessionForBooking(memberId)
      if (consume.ok) subscriptionId = consume.sub.id
    }
  }

  const updateData = { status: 'confirmed' }
  if (subscriptionId) updateData.subscription_id = subscriptionId

  const { data: promoted } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', standby.id)
    .select()
    .single()

  // Push notification is sent by the DB trigger notify_standby_promoted
  // (standby → confirmed fires tg_notify_standby_promoted via pg_net).
}
