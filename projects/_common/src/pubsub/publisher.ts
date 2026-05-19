import {PubSub} from "@google-cloud/pubsub";

export const PUBSUB_TOPIC = {
    notificationReadyToSend: "notification.ready_to_send",
    stayCreated: "stay.created",
    reviewCreated: "review.created"
} as const;


// place for new topics registrations
export const PUSH_SUBSCRIPTIONS: Array<{
    name: string;
    topic:string;
    pushEndpoint: (functionBaseUrl: string) => string
}> = [
    {
        name: "review-created-sub",
        topic: PUBSUB_TOPIC.reviewCreated,
        pushEndpoint: (base) => `${base}/subscribers_notifications/reviewCreated`
    }
]

let client: PubSub | null = null;

function getPubSubClient(): PubSub {
    if (!client) {
        client = new PubSub();
    }

    return client;
}

export async function publishMessage(topic: string, payload: unknown): Promise<void> {
    const client = await getPubSubClient();
    const data = Buffer.from(JSON.stringify(payload));

    try {
        await client.topic(topic).publishMessage({ data });
    } catch (error: any){
        if (error.code === 5)
        {
            await client.createTopic(topic);
            await client.topic(topic).publishMessage({ data });
    } else {
        throw error;
        }
    }
}
// place to init the topics or ignore if not exists,
export async function ensureSubscriptions(functionsBaseUrl: string): Promise<void> {
    const pubsub = getPubSubClient();

    for (const sub of PUSH_SUBSCRIPTIONS) {
        try {
            await pubsub.createTopic(sub.topic);
        } catch (err: any) {
            if (err.code !== 6) throw err; // code 6 = ALREADY_EXISTS — fine
        }

        const pushEndpoint = sub.pushEndpoint(functionsBaseUrl);
        try {
            await pubsub.topic(sub.topic).createSubscription(sub.name, {
                pushConfig: { pushEndpoint },
            });
            console.log(`[pubsub] created subscription: ${sub.name} → ${pushEndpoint}`);
        } catch (err: any) {
            if (err.code !== 6) throw err; // code 6 = ALREADY_EXISTS — fine
        }
    }
}

