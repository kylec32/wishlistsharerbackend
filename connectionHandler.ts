import { APIGatewayEvent, DynamoDBStreamEvent, DynamoDBRecord, Callback, Context, Handler } from 'aws-lambda';
import { UserRepository } from './UserRepository';
import { ResponseHelper } from './ResponseHelper';
import { ConnectionService } from './ConnectionService';
import { EventStore } from './EventStore';
import { Utils } from './Utils';

const userRepository = new UserRepository();
const connectionService = new ConnectionService();
const eventStore = new EventStore();

export const addNew: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        if(await userRepository.userExists(decodeURIComponent(event.pathParameters.identifier))) {
            eventStore.publish(context.awsRequestId, "connect-user", {"connector": event.requestContext.authorizer.principalId,
                                                                        "connecteeEmailAddres":  decodeURIComponent(event.pathParameters.identifier)});
            cb(null, ResponseHelper.simpleMessage(200, "Accounts Linked"));
        } else {

            cb(null, ResponseHelper.simpleMessage(404, "User not found"));
        }
    })()
}

export const handleConnectUsers: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async() => {
        event.Records.forEach((record) => {
            Utils.filterEvent('connect-user', record, (data) => {
                connectionService.connectUser(data.connector, data.connecteeEmailAddres)
                                .then((event) => {
                                    eventStore.publish(Utils.getEvent(record).CorrelationId, "users-connected", Utils.getEvent(record).Payload);
                                })
                                .catch((error) => {
                                    console.log("Error");
                                    console.error(error)
                                });
                
            });
        });

        cb(null, "Handled");
    })();
}

export const handleConnectUsers2: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async() => {
        event.Records.forEach((record) => {
            
            Utils.filterEvent('connect-user', record, (data) => {
                console.log(data);
            });
        });

        cb(null, "Handled");
    })();
}

export const getConnections: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {
        try {
            const result = await connectionService.getFollowees(event.requestContext.authorizer.principalId);
            cb(null, ResponseHelper.withJson(200, {"followees": result}));
        } catch(ex) {
            console.log("Error");
            console.log(ex);
            cb(null, ResponseHelper.simpleMessage(500, "Issue occurred"));
        }
    })();
}

export const deleteConnection: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async() => {
        try {
            eventStore.publish(context.awsRequestId, "disconnect-user",
                                {"connector": event.requestContext.authorizer.principalId,
                                "connecteeId":  decodeURIComponent(event.pathParameters.identifier)});
            cb(null, ResponseHelper.simpleMessage(200, "Accounts Disconnected"));
        } catch(ex) {
            console.error(ex);
            cb(null, ResponseHelper.simpleMessage(500, "Issue Occurred"))
        }
    })();
}

export const handleDisconnectUser: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async() => {
        try {
            
            Utils.filterEventStream('disconnect-user', event, (data, sourceRecord) => {
                console.log()
                connectionService.disconnectFollowee(data.connector, data.connecteeId)
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'users-disconnected', Utils.getEvent(sourceRecord).Payload);
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error)
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
}