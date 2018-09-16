import { APIGatewayEvent, DynamoDBStreamEvent, Callback, Context, Handler } from 'aws-lambda';
import { EventStore } from './EventStore';
import { ResponseHelper } from './ResponseHelper';
import { Utils } from './Utils';
import { PresentService } from './PresentService';

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
                                        console.error(error);
                                        cb(error);
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
}

export const update: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "update-present", {"userId": event.requestContext.authorizer.principalId,
                                                                    "presentId": event.pathParameters.presentId,
                                                                    "present": event.body});

        cb(null, ResponseHelper.simpleMessage(200, "Updated Present"));
    })()
}

export const handleUpdate: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('update-present', event, (data, sourceRecord) => {
                presentService.updatePresent(data.userId, data.presentId, JSON.parse(data.present))
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-updated', Utils.getEvent(sourceRecord).Payload);
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error);
                                        cb(error);
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
                                        console.error(error);
                                        cb(error);
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
}

export const markAsPurchased: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "mark-present-as-purchased", {"userId": event.requestContext.authorizer.principalId,
                                                                    "targetUserId": decodeURIComponent(event.pathParameters.userId),
                                                                    "presentId": decodeURIComponent(event.pathParameters.presentId)});

        cb(null, ResponseHelper.simpleMessage(200, "Mark-As-Purchased"));
    })();
}

export const handleMarkAsPurchased: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('mark-present-as-purchased', event, (data, sourceRecord) => {
                presentService.markPresentAsPurchased(data.userId, data.targetUserId, data.presentId)
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-purchased', Utils.getEvent(sourceRecord).Payload);
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error);
                                        cb(error);
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
}

export const unmarkAsPurchased: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "unmark-present-as-purchased", {"userId": event.requestContext.authorizer.principalId,
                                                                    "targetUserId": decodeURIComponent(event.pathParameters.userId),
                                                                    "presentId": decodeURIComponent(event.pathParameters.presentId)});

        cb(null, ResponseHelper.simpleMessage(200, "Unmark-As-Purchased"));
    })();
}

export const handleUnmarkAsPurchased: Handler = (event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('unmark-present-as-purchased', event, (data, sourceRecord) => {
                presentService.unmarkPresentAsPurchased(data.userId, data.targetUserId, data.presentId)
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-unpurchased', Utils.getEvent(sourceRecord).Payload);
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error);
                                        cb(error);
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
}
