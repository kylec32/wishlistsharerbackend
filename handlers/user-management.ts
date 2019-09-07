import { APIGatewayEvent, DynamoDBStreamEvent, CustomAuthorizerEvent, CustomAuthorizerResult, PolicyDocument, Statement, DynamoDBRecord, Callback, Context, Handler} from 'aws-lambda';
import * as uuid from 'uuid/v1';
import * as bcryptjs from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { UserRepository } from '../services/UserRepository';
import { EventStore } from '../services/EventStore';
import { ResponseHelper } from '../utils/ResponseHelper';
import * as request from 'request';
import { Utils } from '../utils/Utils';
const thundra = require("@thundra/core")({ apiKey: process.env.THUNDRA_API_KEY });

const eventStore = new EventStore();
const userRepository = new UserRepository();
const privateKey = fs.readFileSync('./keys/private.key');
const publicKey = fs.readFileSync('./keys/public.key');

export const authorizer: Handler = thundra((event: CustomAuthorizerEvent, context: Context, cb: any) => {

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
    const authResponse = <any>{};
    authResponse.principalId = principalId;
    if (effect && resource) {
      const policyDocument = <any>{};
      policyDocument.Version = '2012-10-17';
      policyDocument.Statement = [];
      const statementOne = <any>{};
      statementOne
      statementOne.Action = 'execute-api:Invoke';
      statementOne.Effect = effect;
      statementOne.Resource = resource;
      policyDocument.Statement[0] = statementOne;
      authResponse.policyDocument = policyDocument;
    }
    return authResponse;
};

export const signIn: Handler = thundra((event: APIGatewayEvent, context: Context, cb: Callback) => {
    const body = JSON.parse(event.body);
    (async() => {
        try {
            const user = await userRepository.getUser(body.emailAddress);

            if(await bcryptjs.compare(`${body.emailAddress.toLowerCase()}_${body.password}`, user.password)) {
                eventStore.publish(context.awsRequestId, 'login-succeeded', {"userName": body.emailAddress});
               
               const token = jwt.sign({'user_id': user.id,}, privateKey, { algorithm: 'RS256', expiresIn: 60 * 60 * 24 });
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

export const handleSignUpEvent: Handler = thundra((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
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

export const forgottenPassword: Handler = thundra((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {
        try {
            const forgottenPasswordUser = await userRepository.getUser(event.pathParameters.email.toLowerCase());
            const authorizedToken = jwt.sign({'id': forgottenPasswordUser.id, 'userName': forgottenPasswordUser.user_name}, privateKey, { algorithm: 'RS256', expiresIn: 60 * 15 });
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

export const resetPassword: Handler = thundra((event: APIGatewayEvent, context: Context, cb: Callback) => {
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

export const handleResetPassword: Handler = thundra((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
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

export const signUp: Handler = thundra((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {

        try {
            const parsedBody = JSON.parse(event.body);
    
            let hashedPasswordPromise = hashPassword(parsedBody.username.toLowerCase(), parsedBody.password);

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

export const searchUsers: Handler = thundra((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        cb(null, ResponseHelper.withJson(200, await userRepository.searchUsers(decodeURIComponent(event.pathParameters.name))));
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
