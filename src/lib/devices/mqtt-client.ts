import mqtt, { MqttClient } from "mqtt";

/**
 * Singleton MQTT client shared across the whole server process — and across EVERY outlet on the
 * platform. This app runs on Vercel (serverless, no fixed network), so MQTT_BROKER_URL must point
 * at ONE centrally-hosted, internet-reachable broker (e.g. Mosquitto on the same VPS that runs
 * scripts/relay-hub.ts and scripts/ipaymu-egress-proxy.ts — see that VPS's ecosystem.config.js),
 * NOT a broker sitting on a single outlet's own local LAN (unreachable from Vercel, and unreachable
 * by every OTHER outlet's Tasmota devices too). Every outlet's Tasmota device connects OUT to this
 * same broker over the internet, same as any other MQTT-over-WAN setup.
 *
 * Because the broker is shared, `devices.mqttTopic` must be unique ACROSS EVERY OUTLET, not just
 * within one — see assertMqttTopicGloballyUnique() in app/api/devices/route.ts, which enforces this
 * at save time. Two different outlets picking the same topic string would otherwise let one
 * outlet's on/off command land on another outlet's physical plug.
 *
 * ENV:
 *   MQTT_BROKER_URL   e.g. mqtt://mqtt.nexbill.id:1883 (or mqtts://...:8883 once/if TLS is set up)
 *   MQTT_USERNAME
 *   MQTT_PASSWORD
 */

let client: MqttClient | null = null;
let connecting: Promise<MqttClient> | null = null;

export function getMqttClient(): Promise<MqttClient> {
  if (client && client.connected) return Promise.resolve(client);
  if (connecting) return connecting;

  const url = process.env.MQTT_BROKER_URL;
  if (!url) {
    return Promise.reject(
      new Error(
        "MQTT_BROKER_URL belum diset di .env — device control (Tasmota) tidak akan berfungsi sampai broker MQTT dikonfigurasi."
      )
    );
  }

  connecting = new Promise((resolve, reject) => {
    const c = mqtt.connect(url, {
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      reconnectPeriod: 3000,
      connectTimeout: 8000,
    });

    c.once("connect", () => {
      client = c;
      connecting = null;
      resolve(c);
    });

    c.once("error", (err) => {
      connecting = null;
      reject(err);
    });
  });

  return connecting;
}

/** Publish a command and wait briefly (fire-and-forget with ack via QoS1). */
export async function publishCommand(topic: string, payload: string) {
  const c = await getMqttClient();
  return new Promise<void>((resolve, reject) => {
    c.publish(topic, payload, { qos: 1 }, (err) => (err ? reject(err) : resolve()));
  });
}

/** Subscribe once and resolve with the next message on that topic (used to read power state). */
export async function requestState(statusTopic: string, triggerTopic: string, triggerPayload: string, timeoutMs = 4000) {
  const c = await getMqttClient();
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      c.removeListener("message", onMessage);
      reject(new Error("Timeout waiting for device state"));
    }, timeoutMs);

    function onMessage(topic: string, message: Buffer) {
      if (topic === statusTopic) {
        clearTimeout(timer);
        c.removeListener("message", onMessage);
        resolve(message.toString());
      }
    }

    c.subscribe(statusTopic, { qos: 0 }, (err) => {
      if (err) {
        clearTimeout(timer);
        return reject(err);
      }
      c.on("message", onMessage);
      c.publish(triggerTopic, triggerPayload);
    });
  });
}
