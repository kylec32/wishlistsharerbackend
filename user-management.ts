import { APIGatewayEvent, DynamoDBStreamEvent, CustomAuthorizerEvent, CustomAuthorizerResult, PolicyDocument, Statement, DynamoDBRecord, Callback, Context, Handler, StatementAction, StatementResource } from 'aws-lambda';
import { DynamoDB, Response} from 'aws-sdk';
import { GetItemInput, PutItemInput } from 'aws-sdk/clients/dynamodb';
import * as uuid from 'uuid/v1';
import * as bcryptjs from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { Event } from './message';
import { UserRepository } from './UserRepository';
import { EventStore } from './EventStore';
import { ResponseHelper } from './ResponseHelper';
import * as request from 'request';
import { Utils } from './Utils';
var iopipe = require('@iopipe/iopipe')({ token: process.env.IOPIPE_TOKEN });

const dynamoClient = new DynamoDB.DocumentClient({region: 'us-east-1'});
const eventStore = new EventStore();
const userRepository = new UserRepository();
const privateKey = fs.readFileSync('./keys/private.key');
const publicKey = fs.readFileSync('./keys/public.key');

export const authorizer: Handler = iopipe((event: CustomAuthorizerEvent, context: Context, cb: any) => {

    if (event.authorizationToken) {
        // remove "bearer " from token
        const token = event.authorizationToken.substring(7);
  
        try {
          const decoded: any = jwt.verify(token, publicKey);
          cb(null, generatePolicy(decoded.user_id, 'Allow', '*'));
        } catch(err) {
            console.error(err);
            cb("Unauthorized");
            return;
        }
    } else {
        cb("Unauthorized");
    }
});

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

export const verify: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
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
});

export const signIn: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
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
});

export const handleSignUpEvent: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    Utils.filterEventStream("sign-up", event, (data, sourceRecord: DynamoDBRecord) => {
        (async() => {
            await userRepository.createUser(data.firstName,
                data.lastName,
                data.user_name.toLowerCase(),
                data.password, uuid());

            await eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId,
                                    "signed-up",
                                    data);
        })()

    });

    cb(null, "Handled Sign Up");
});

export const forgottenPassword: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {
        try {
            const forgottenPasswordUser = await userRepository.getUser(event.pathParameters.email.toLowerCase());
            const authorizedToken = jwt.sign({'id': forgottenPasswordUser.id, 'userName': forgottenPasswordUser.email_address}, privateKey, { algorithm: 'RS256', expiresIn: 60 * 15 });
            const forgottenPasswordEvent = {
                'userId': forgottenPasswordUser.id,
                'token': authorizedToken,
                'email': forgottenPasswordUser.user_name,
                'user': forgottenPasswordUser
            };

            eventStore.publish(context.awsRequestId, 'forgotten-password', forgottenPasswordEvent);

            cb(null, ResponseHelper.simpleMessage(202, "Forgotten password request acceptted."));
        } catch(ex) {
            console.error(ex);
            cb(null, ResponseHelper.simpleMessage(404, "User not found"));
        }
    })();
});

export const resetPassword: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {
        try {
            const body = JSON.parse(event.body);
            const decoded = jwt.verify(body.token, publicKey);

            const resetPasswordEvent = {
                "targetUserId": decoded['id'],
                "newPassword": await hashPassword(decoded['userName'], body.password)
            }

            eventStore.publish(context.awsRequestId, 'reset-password', resetPasswordEvent);

            cb(null, ResponseHelper.simpleMessage(202, "Password-Resetting"));

        } catch(ex) {
            cb(null, ResponseHelper.simpleMessage(403, "Incorrect token"))
        }
    })();
});

export const handleResetPassword: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async() => {
        Utils.filterEventStream('reset-password', event, (data, sourceRecord) => {
            try {
                userRepository.updatePassword(data.targetUserId, data.newPassword)
                    .then(value => eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'password-reset', value))
                    .catch(err => {
                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'password-unsuccessfully-reset', {})
                        console.error("Error:");
                        console.error(err);
                    })
            } catch(ex) {
                console.error("Error:");
                console.error(ex);
            }
        });
        cb(null, "Handled");
    })();
});

export const signUp: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {

        try {
            const parsedBody = JSON.parse(event.body);
    
            let hashedPasswordPromise = hashPassword(parsedBody.username, parsedBody.password);

            if(!await validateCaptcha(parsedBody.captcha)) {
                cb(null, ResponseHelper.simpleMessage(403, "Incorrect CAPTCHA"));
                return;
            }

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
});

async function validateCaptcha(captcha: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        request.post('https://www.google.com/recaptcha/api/siteverify',
        {form: {
                    secret: process.env.CAPTCHA_SECRET,
                    response: captcha
                }
            }, (error: any, response: request.Response, body: any) => {
                if(error) {
                    reject(error);
                }

                resolve(JSON.parse(body).success)
            })
    });
    
}

async function hashPassword(username: string, password: string): Promise<string> {
    console.log(`${username}_${password}`);
    return bcryptjs.hash(`${username}_${password}`, 10)
}
