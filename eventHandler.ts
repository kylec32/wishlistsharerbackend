import { SNSEvent, SNSEventRecord, Callback, Context, Handler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { PutItemInput } from 'aws-sdk/clients/dynamodb';
import { Event } from './message';
var iopipe = require('@iopipe/iopipe')({ token: process.env.IOPIPE_TOKEN });

const client = new DynamoDB.DocumentClient({region: 'us-east-1'});

export const persistEvent: Handler = iopipe((event: SNSEvent, context: Context, cb: Callback) => {

  event.Records.forEach((record: SNSEventRecord) => {

    const event = <Event>JSON.parse(record.Sns.Message);

    const item = <PutItemInput>{
      TableName: "eventsTable",
      Item: {
        event_id: new Date().getTime(),
        Type: event.Type,
        Payload: event.Payload,
        CorrelationId: event.correlation_id,
        Timestamp: event.timestamp
      }
    };

    client.put(item, (error, output) => {
      if(error) {
        console.error(error);
        cb(error);
      }

      console.log(output);
      cb(null, "Persisted");
    });
  })
});
