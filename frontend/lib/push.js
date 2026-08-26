import webpush from "web-push";
import PushSubscription from "./models/PushSubscription";

let configured = false;

function configureWebPush() {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@skychat.app";

  if (!publicKey || !privateKey) {
    console.warn("VAPID keys missing — push notifications disabled.");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Send a Chrome/web push notification to one or more users.
 */
export async function sendPushToUsers(userIds, payload) {
  if (!configureWebPush()) return { sent: 0 };

  const ids = [...new Set(userIds.map(String).filter(Boolean))];
  if (!ids.length) return { sent: 0 };

  const subs = await PushSubscription.find({ userId: { $in: ids } });
  if (!subs.length) return { sent: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          body
        );
        sent += 1;
      } catch (err) {
        // Gone / expired subscription — remove it
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Push send error:", err.statusCode || err.message);
        }
      }
    })
  );

  return { sent };
}
