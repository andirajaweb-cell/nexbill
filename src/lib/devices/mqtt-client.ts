import mqtt, { MqttClient } from "mqtt";

/**
 * Singleton MQTT client shared across the whole server process.
 * Works with any Tasmota-flashed smart plug (or Tasmota-compatible firmware)
 * connected to a local MQTT broker (e.g. Mosquitto running on the same
 * network / a Raspberry Pi at the outlet).
 *
 * ENV:
 *   MQTT_BROKER_URL   e.g. mqtt://192.168.1.10:1883
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
