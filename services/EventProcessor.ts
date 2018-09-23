import { APIGatewayEvent, DynamoDBStreamEvent, CustomAuthorizerEvent, CustomAuthorizerResult, PolicyDocument, Statement, DynamoDBRecord, StreamRecord, Callback, Context, Handler, StatementAction, StatementResource } from 'aws-lambda';
import { SQS, DynamoDB, SNS, AWSError, Lambda } from 'aws-sdk';
import { DocumentClient, GetItemInput, UpdateItemInput, QueryInput, ScanInput } from 'aws-sdk/clients/dynamodb';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import { ResponseHelper } from '../utils/ResponseHelper';

const dynamoClient = new DynamoDB.DocumentClient({region: process.env.AWS_REGION});

export const verify: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {

    (async() => {
        // try {
        //     const params =  <ScanInput>{
        //         TableName: "eventsTable"
        //     }
        
        
        //     const events = await dynamoClient.scan(params).promise();
    
        //     const fakeStreamEvent = <DynamoDBStreamEvent>{
        //         Records: [
        //         ]
        //     }
    
        //     events.Items.forEach((item) => {
        //         fakeStreamEvent.Records.push(
        //             <DynamoDBRecord>{
        //                 dynamodb: <StreamRecord>{
        //                     NewImage: DynamoDB.Converter.marshall(item)
        //                 }
        //             }
        //         );
        //     });
    
        //     fakeStreamEvent.Records.forEach((record) => {
        //         console.log(record.dynamodb.NewImage)
        //     });
    
        //     const request = <InvocationRequest> {
        //         FunctionName: JSON.parse(event.body).arn,
        //         Payload: JSON.stringify(fakeStreamEvent)
        //     }
    
        //     await new Lambda({region: process.env.AWS_REGION}).invoke(request).promise();
    
        //     cb(null, ResponseHelper.simpleMessage(200, "Run"));
        // } catch(ex) {
        //     console.error(ex);

        //     cb(null, ResponseHelper.simpleMessage(500, "Darn"));
        // }
        

    })();
}