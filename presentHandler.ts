import { APIGatewayEvent, DynamoDBStreamEvent, DynamoDBRecord, Callback, Context, Handler } from 'aws-lambda';
import { EventStore } from './EventStore';
import { ResponseHelper } from './ResponseHelper';
import { Utils } from './Utils';
import { PresentService } from './PresentService';
import { PresentView } from './models/PresentView';

const eventStore = new EventStore();
const presentService = new PresentService();

export const addNew: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "add-present", {"userId": event.requestContext.authorizer.principalId,
                                                                    "present": event.body});

        cb(null, ResponseHelper.simpleMessage(200, "Added Present"));
    })()
}

export const handleAddNew: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('add-present', event, (data, sourceRecord) => {
                presentService.addPresent(data.userId, JSON.parse(data.present))
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-added', Utils.getEvent(sourceRecord).Payload);
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

export const getUserPresents: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            cb(null, ResponseHelper.withJson(200, await presentService.getUserPresents(event.requestContext.authorizer.principalId)));
        } catch(ex) {
            console.error("Error:");
            console.log(ex);
            cb(null, ResponseHelper.simpleMessage(500, "Issue encountered"));
        }
    })();
}

export const deletePresent: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "delete-present", {"userId": event.requestContext.authorizer.principalId,
                                                                    "presentId": decodeURIComponent(event.pathParameters.presentId)});

        cb(null, ResponseHelper.simpleMessage(200, "Deleted-Present"));
    })();
}

export const handleDeletePresent: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('delete-present', event, (data, sourceRecord) => {
                presentService.deletePresent(data.userId, data.presentId)
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-deleted', Utils.getEvent(sourceRecord).Payload);
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