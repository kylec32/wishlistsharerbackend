import { APIGatewayEvent, DynamoDBStreamEvent, CustomAuthorizerEvent, CustomAuthorizerResult, PolicyDocument, Statement, DynamoDBRecord, Callback, Context, Handler, StatementAction, StatementResource } from 'aws-lambda';
import { SQS, DynamoDB, SNS, AWSError } from 'aws-sdk';
import { GetItemInput, ScanInput, PutItemInput } from 'aws-sdk/clients/dynamodb';
import * as uuid from 'uuid/v1';
import * as bcryptjs from 'bcryptjs';
import * as p from 'typed-promisify';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { Event } from './message';
import { UserRepository } from './UserRepository';
import { EventStore } from './EventStore';
import { ResponseHelper } from './ResponseHelper';

const dynamoClient = new DynamoDB.DocumentClient({region: 'us-east-1'});
const eventStore = new EventStore();
const userRepository = new UserRepository();
const privateKey = fs.readFileSync('./keys/private.key');
const publicKey = fs.readFileSync('./keys/public.key');

export const authorizer: Handler = (event: CustomAuthorizerEvent, context: Context, cb: Callback) => {
    if (event.authorizationToken) {
        // remove "bearer " from token
        const token = event.authorizationToken.substring(7);
  
        try {
          const decoded: any = jwt.verify(token, publicKey);
          console.log(decoded);
          cb(null, generatePolicy(decoded.user_id, 'Allow', '*'));
        } catch(err) {
          console.log("rejecting in first if");
          console.log(event);
          cb(err);
        }
      } else {
        console.log("rejecting in second if");
        console.log(event);
        cb(null, 'Unauthorized');
      }
}

function generatePolicy(principalId, effect, resource): CustomAuthorizerResult {
    const authResponse = <CustomAuthorizerResult>{};
    authResponse.principalId = principalId;
    if (effect && resource) {
      const policyDocument = <PolicyDocument>{};
      policyDocument.Version = '2012-10-17';
      policyDocument.Statement = [];
      const statementOne = <Statement>{};
      statementOne
      statementOne.Action = 'execute-api:Invoke';
      statementOne.Effect = effect;
      statementOne.Resource = resource;
      policyDocument.Statement[0] = statementOne;
      authResponse.policyDocument = policyDocument;
    }
    return authResponse;
};

export const verify: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    const params = <GetItemInput>{
        TableName: 'userTable',
        Key: {'user_name': 1535432690997}
    }; 

    dynamoClient.get(params, (error, result) => {
            // handle potential errors
            if (error) {
            console.error(error);
            cb(null, {
                statusCode: error.statusCode || 501,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Couldn\'t fetch the todo item.',
            });
            return;
        }

        cb(null, {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Looks good',
        });
    });
}

export const signIn: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    const body = JSON.parse(event.body);
    (async() => {
        try {
            const user = await userRepository.getUser(body.emailAddress);

            if(await bcryptjs.compare(`${body.emailAddress}_${body.password}`, user.password)) {
                eventStore.publish(context.awsRequestId, 'login-succeeded', {"userName": body.emailAddress});
               
               const token = jwt.sign({'user_id': user.id,}, privateKey, { algorithm: 'RS256', expiresIn: 60 * 60 * 8 });
               cb(null, ResponseHelper.withJson(200, {'found': true, 
                                                        'token': token}));
            } else {
                console.log("Passwords don't match")

                eventStore.publish(context.awsRequestId, 'login-failure', {"userName": body.emailAddress});

                cb(null, ResponseHelper.withJson(401, {'found': false, 
                                                        'token': ''}));
            }
        } catch(ex) {
            console.error(ex);
            eventStore.publish(context.awsRequestId, 'login-failure', {"userName": body.emailAddress});

            cb(null, ResponseHelper.withJson(401, {'found': false, 
                                                    'token': ''}));
        }
    })();
}

function handleEvent(type: string, dbRecord: DynamoDBRecord, found: (data: any) => void): void   {
    const event = <Event>DynamoDB.Converter.unmarshall(dbRecord.dynamodb.NewImage);
    console.log(event);
    if(event.Type == type) {
        found(event.Payload);
    }
}

export const handleSignUpEvent: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    event.Records.forEach(record => {
        handleEvent("sign-up", record, (newSignup: any) => {
            console.log(record);
            const item = <PutItemInput>{
                TableName: "userTable",
                Item: {
                    user_name: newSignup.user_name,
                    first_name: newSignup.firstName,
                    last_name: newSignup.lastName,
                    email_address: newSignup.emailAddress,
                    password: newSignup.password,
                    id: uuid()
                }
              };
          
              dynamoClient.put(item, (error, output) => {
                if(error) {
                    console.log("Error:");
                    console.error(error);
                }
          
                console.log("Success:");
                console.log(output);
              });
              console.log("NewSignup:");
            console.log(newSignup);
        });
    });

    cb(null, "Handled Sign Up");
}

export const signUp: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {

        try {
            const parsedBody = JSON.parse(event.body);
    
            let hashedPasswordPromise = hashPassword(parsedBody.username, parsedBody.password);

            try {
                await userRepository.getUser(parsedBody.username)

                cb(null, ResponseHelper.simpleMessage(409, "User name already exists."));
                return;
            } catch(ex) {
                
                eventStore.publish(context.awsRequestId, "sign-up", {
                    "firstName": parsedBody.firstName,
                    "lastName": parsedBody.lastName,
                    "emailAddress": parsedBody.emailAddress,
                    "user_name": parsedBody.username,
                    "password": await hashedPasswordPromise
                });

                console.log(ResponseHelper.simpleMessage(201, "Account created."));

                cb(null, ResponseHelper.simpleMessage(201, "Account created."));
                return;
            }
    
        } catch(ex) {
            console.error(ex)
        }

        cb(null, ResponseHelper.simpleMessage(500, "Something went wrong with creating your account."));
    })();
}

async function hashPassword(username: string, password: string): Promise<string> {
    console.log(`${username}_${password}`);
    return bcryptjs.hash(`${username}_${password}`, 10)
}
