import { Event } from './message';
import { DynamoDB } from 'aws-sdk';
import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';

export class Utils {
    static filterEvent(type: string, dbRecord: DynamoDBRecord, found: (data: any) => void): void {
        try {
            const event = <Event>DynamoDB.Converter.unmarshall(dbRecord.dynamodb.NewImage);
            
            if(event.Type == type) {
                found(event.Payload);
            }
        } catch(ex) {
            console.error(ex);
        }
    }

    static filterEventStream(type: string, event: DynamoDBStreamEvent, found: (data: any, sourceRecord: DynamoDBRecord) => void): void {
        event.Records.forEach((record) => {
            try {
                const event = <Event>DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
                if(event.Type == type) {
                    found(event.Payload, record);
                }
            } catch(ex) {
                console.error(ex);
            }
        });
    }

    static getEvent(dbRecord: DynamoDBRecord): Event {
        console.log(dbRecord.dynamodb);
        return <Event>DynamoDB.Converter.unmarshall(dbRecord.dynamodb.NewImage);
    }

}