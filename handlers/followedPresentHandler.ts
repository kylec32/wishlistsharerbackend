import { APIGatewayEvent, DynamoDBStreamEvent, Callback, Context, Handler } from 'aws-lambda';
import { ResponseHelper } from '../utils/ResponseHelper';
import { PresentService } from '../services/PresentService';
const thundra = require("@thundra/core")({ apiKey: process.env.THUNDRA_API_KEY });

const presentService = new PresentService();

export const getPresents: Handler = thundra((event: APIGatewayEvent, context: Context, cb: Callback) => {
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
});