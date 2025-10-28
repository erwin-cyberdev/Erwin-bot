// utils/sendSafely.js
import axios from 'axios'
import { canSend, recordSend } from './rateLimiter.js'
import { isOptedIn } from './consent.js'

const token = process.env.WABA_ACCESS_TOKEN
const phoneId = process.env.WABA_PHONE_ID
if (!token || !phoneId) console.warn('WABA env missing')

export async function sendTextViaCloud(toNumber, text){
  if (!isOptedIn(toNumber)) throw new Error('not_opted_in')
  if (!canSend(toNumber)) throw new Error('quota_exceeded')
  const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`
  const body = {
    messaging_product: "whatsapp",
    to: toNumber.replace(/\D/g,''),
    type: "text",
    text: { body: text }
  }
  const res = await axios.post(url, body, { headers: { Authorization: `Bearer ${token}` } })
  recordSend(toNumber)
  return res.data
}
