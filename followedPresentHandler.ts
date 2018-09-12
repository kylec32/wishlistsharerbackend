import { APIGatewayEvent, DynamoDBStreamEvent, Callback, Context, Handler } from 'aws-lambda';
import { EventStore } from './EventStore';
import { ResponseHelper } from './ResponseHelper';
import { Utils } from './Utils';
import { PresentService } from './PresentService';

const presentService = new PresentService();

export const getPresents: Handler = (event: APIGatewayEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            cb(null, ResponseHelper.withJson(200,
                        await presentService.getFollowedUserPresents(event.requestContext
                                                                            .authorizer
                                                                            .principalId)));
        } catch(ex) {
            console.error("Error:");
            console.error(ex);
            cb(null, ResponseHelper.withJson(500, []));
        }
    })()
}