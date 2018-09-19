import { DynamoDB } from 'aws-sdk';
import { DocumentClient, GetItemInput, UpdateItemInput, PutItemInput, ScanInput } from 'aws-sdk/clients/dynamodb';
import { User } from './models/User';

export class UserRepository {

    private dynamoClient: DocumentClient

    constructor() {
        this.dynamoClient = new DynamoDB.DocumentClient({region: 'us-east-1'});
    }

    async getUser(userName: string): Promise<User> {
        const findUserNameRequest = <GetItemInput>{
            TableName: 'userTable',
            Key: {'user_name': userName.toLowerCase()}
        };

        const response = await this.dynamoClient.get(findUserNameRequest).promise();

        if(response.Item == undefined) {
            throw new Error("No user found");
        }

        return <User>response.Item;
    }

    async getUserById(userId: string): Promise<User> {
        const findByUserIdRequest = <ScanInput>{
            TableName: 'userTable',
            FilterExpression: "id = :id",
            ExpressionAttributeValues: {
                ":id": userId
            }
        };

        let response = await this.dynamoClient.scan(findByUserIdRequest).promise();
    
        if(response.Items.length != 1) {
            throw new Error("No user found");
        }

        response.Items.map((item) => item.followingUserIds = item.following_user_ids );

        return <User>response.Items[0];
    }

    async getUserByIds(userIds: string[]): Promise<User[]> {
        const findUsersByIds = <ScanInput>{
            TableName: 'userTable',
            FilterExpression: "contains(:search_ids, id)",
            ExpressionAttributeValues: {
                ":search_ids": userIds
            }
        };

        const response = await this.dynamoClient.scan(findUsersByIds).promise();

        return <User[]>response.Items;
    }

    async userExists(emailAddress: string): Promise<boolean> {
        if(emailAddress == undefined) {
            console.error("No email address provided");
            return false;
        }

        const userExistsRequest = <GetItemInput>{
            TableName: 'userTable',
            Key: {'user_name': emailAddress}
        };

        const response = await this.dynamoClient.get(userExistsRequest).promise();

        return response.Item != undefined;
    }

    async updateUser(user: User) {
        try {
            const updateRequest = <UpdateItemInput>{
                TableName: 'userTable',
                Key: {'user_name': user.user_name},
                UpdateExpression: "set first_name = :firstName, last_name = :lastName, email_address = :emailAddress, password = :password, following_user_ids = :followingUserIds, presents = :presents",
                ExpressionAttributeValues:{
                    ":firstName": user.first_name,
                    ":lastName": user.last_name,
                    ":emailAddress": user.email_address,
                    ":password": user.password,
                    ":followingUserIds": user.followingUserIds == undefined ? [] : user.followingUserIds,
                    ":presents": user.presents == undefined ? [] : user.presents
                },
                ReturnValues: "UPDATED_NEW"
            }

            const updateResponse = await this.dynamoClient.update(updateRequest).promise();
    
            return updateResponse.$response;
        } catch (ex) {
            console.error(ex);
        }
        
    }

    async createUser(firstName: string, lastName: string, email: string, password: string, id: string) {
        const item = <PutItemInput>{
            TableName: "userTable",
            Item: {
                user_name: email.toLowerCase(),
                first_name: firstName,
                last_name: lastName,
                password: password,
                id: id
            }
        };

        return this.dynamoClient.put(item).promise();
    }
}