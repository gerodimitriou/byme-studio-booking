import emailjs from '@emailjs/browser'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export async function sendConfirmationEmail({ id, name, email, service, booking_date, booking_time }) {
  const cancel_url = `${window.location.origin}/cancel/${id}`

  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_name:      name,
      to_email:     email,
      service,
      booking_date,
      booking_time,
      cancel_url,
    },
    PUBLIC_KEY,
  )
}
