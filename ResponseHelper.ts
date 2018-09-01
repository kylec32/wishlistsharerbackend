import { APIGatewayProxyResult } from 'aws-lambda';

export class ResponseHelper {
    static simpleMessage(statusCode: number, message: string): APIGatewayProxyResult {
        return {
            statusCode: statusCode,
            body: JSON.stringify({
                message: message,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            }
        };
    }

    static withJson(statusCode: number, responseObject: object): APIGatewayProxyResult {
        return {
            statusCode: statusCode,
            body: JSON.stringify(responseObject),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            }
        };
    }
}