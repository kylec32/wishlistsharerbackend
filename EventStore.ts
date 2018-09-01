import { PublishInput, PublishResponse } from 'aws-sdk/clients/sns';
import { SNS, AWSError } from 'aws-sdk';

export class EventStore {
    private sns: SNS;

    constructor() {
        this.sns = new SNS({region: 'us-east-1'});
    }

    async publish(correlationId: string, type: string, payload: any) {
        const event = {
            "Type": type,
            "correlation_id": correlationId,
            "timestamp": new Date().toISOString().toString(),
            "Payload": payload
        };

        const params = <PublishInput>{
            Message: JSON.stringify(event),
            TopicArn: 'arn:aws:sns:us-east-1:927245588110:eventsTopic'
        }

        try {
            await this.sns.publish(params)
            this.sns.publish(params, (err: AWSError, data: PublishResponse) => {
                if(err) {
                    console.error(err);
                    throw new Error("Issue with publish")
                }
            });
        } catch(ex) {
            console.error(ex);
            throw new Error("Unable to publish event");
        }
    }
}