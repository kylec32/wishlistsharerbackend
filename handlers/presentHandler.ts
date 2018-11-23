import { APIGatewayEvent, DynamoDBStreamEvent, Callback, Context, Handler } from 'aws-lambda';
import { EventStore } from '../services/EventStore';
import { ResponseHelper } from '../utils/ResponseHelper';
import { Utils } from '../utils/Utils';
import { PresentService } from '../services/PresentService';
import { Present } from '../models/Present';
import { UserNotificationService } from '../services/UserNotificationService';
var iopipe = require('@iopipe/iopipe')({ token: process.env.IOPIPE_TOKEN });

const eventStore = new EventStore();
const presentService = new PresentService();
const userNotificationService = new UserNotificationService();

export const addNew: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "add-present", {"userId": event.requestContext.authorizer.principalId,
                                                                    "present": event.body});

        cb(null, ResponseHelper.simpleMessage(200, "Added Present"));
    })()
});

export const handleAddNew: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
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
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
});

export const handlePresentNotifications: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            Utils.filterEventStream('present-added', event, (data, sourceRecord) => {
                userNotificationService.notifyFollowersOfNewPresent(data.userId, JSON.parse(data.present))
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-added-notification-sent', Utils.getEvent(sourceRecord).Payload);
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error);
                                    });
            });

            Utils.filterEventStream('present-updated', event, (data, sourceRecord) => {
                userNotificationService.notifyPurchaserOfChange(data.userId, data.presentId, JSON.parse(data.present))
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'handled-present-update-notification', Utils.getEvent(sourceRecord).Payload);
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error);
                                    });
            });

            Utils.filterEventStream('present-deleted', event, (data, sourceRecord) => {
                userNotificationService.notifyPurchaserOfDelete(data.userId, data.present)
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-deleted-notification-sent', Utils.getEvent(sourceRecord).Payload);
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error);
                                    });
            });

            Utils.filterEventStream('present-purchased', event, (data, sourceRecord) => {
                presentService.getUserPresents(data.targetUserId).then(presents => {
                    const present = <Present>presents.filter(present => present.id == data.presentId)[0];
                    userNotificationService.notifyFollowersOfPresentPurchased(data.targetUserId, present, data.userId)
                        .then((event) => {
                            eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-purchased-notification-sent', Utils.getEvent(sourceRecord).Payload);
                        })
                        .catch((error) => {
                            console.log("Error");
                            console.error(error);
                        });
                }).catch(error => console.error(error));
            });
            
            console.log("Right before call:");
            console.log(event);
            Utils.filterEventStream('present-unpurchased', event, (data, sourceRecord) => {
                   console.log("entered thing");
                presentService.getUserPresents(data.targetUserId).then(presents => {
                    const present = <Present>presents.filter(present => present.id == data.presentId)[0];
                 userNotificationService.notifyFollowersOfPresentUnpurchased(data.targetUserId, present, data.userId)
                        .then((event) => {
                            eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-unpurchased-notification-sent', Utils.getEvent(sourceRecord).Payload);
                        })
                        .catch((error) => {
                            console.log("Error");
                            console.error(error);
                        });
                }).catch(error => console.error(error));
            });
                                    
                                    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
});

export const update: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "update-present", {"userId": event.requestContext.authorizer.principalId,
                                                                    "presentId": event.pathParameters.presentId,
                                                                    "present": event.body});

        cb(null, ResponseHelper.simpleMessage(200, "Updated Present"));
    })()
});

export const handleUpdate: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
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
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
});

export const getUserPresents: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            cb(null, ResponseHelper.withJson(200, await presentService.getUserPresents(event.requestContext.authorizer.principalId)));
        } catch(ex) {
            console.error("Error:");
            console.log(ex);
            cb(null, ResponseHelper.simpleMessage(500, "Issue encountered"));
        }
    })();
});

export const deletePresent: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "delete-present", {"userId": event.requestContext.authorizer.principalId,
                                                                    "presentId": decodeURIComponent(event.pathParameters.presentId)});

        cb(null, ResponseHelper.simpleMessage(200, "Deleted-Present"));
    })();
});

export const handleDeletePresent: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('delete-present', event, (data, sourceRecord) => {
                presentService.deletePresent(data.userId, data.presentId)
                                    .then((event) => {
                                        eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, 'present-deleted',
                                                            {'userId': Utils.getEvent(sourceRecord).Payload.userId,
                                                            'present': event});
                                    })
                                    .catch((error) => {
                                        console.log("Error");
                                        console.error(error);
                                    });
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
});

export const markAsPurchased: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "mark-present-as-purchased", {"userId": event.requestContext.authorizer.principalId,
                                                                    "targetUserId": decodeURIComponent(event.pathParameters.userId),
                                                                    "presentId": decodeURIComponent(event.pathParameters.presentId)});

        cb(null, ResponseHelper.simpleMessage(200, "Mark-As-Purchased"));
    })();
});

export const handleMarkAsPurchased: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
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
});

export const unmarkAsPurchased: Handler = iopipe((event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        await eventStore.publish(context.awsRequestId, "unmark-present-as-purchased", {"userId": event.requestContext.authorizer.principalId,
                                                                    "targetUserId": decodeURIComponent(event.pathParameters.userId),
                                                                    "presentId": decodeURIComponent(event.pathParameters.presentId)});

        cb(null, ResponseHelper.simpleMessage(200, "Unmark-As-Purchased"));
    })();
});

export const handleUnmarkAsPurchased: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
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
});
