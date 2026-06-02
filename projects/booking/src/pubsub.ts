import { PubSub } from "@google-cloud/pubsub";

const pubsub = new PubSub();

export async function publishJson(topicName: string, payload: unknown): Promise<void> {
  const topic = pubsub.topic(topicName);
  const [exists] = await topic.exists();

  if (!exists) {
    await pubsub.createTopic(topicName);
  }

  await pubsub.topic(topicName).publishMessage({
    data: Buffer.from(JSON.stringify(payload)),
    attributes: {
      contentType: "application/json",
    },
  });
}
