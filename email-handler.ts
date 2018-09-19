import { DynamoDBStreamEvent, Callback, Context, Handler, APIGatewayEvent } from 'aws-lambda';
import { Utils } from './Utils';
import { EmailService } from './EmailService';
var iopipe = require('@iopipe/iopipe')({ token: process.env.IOPIPE_TOKEN });


const emailService: EmailService = new EmailService();
export const handleNewUser: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('signed-up', event, (data, sourceRecord) => {
                console.log("Do some stuff");
                emailService.sendTextMessage(data.user_name, "Welcome to WishListSharer.tk", "Welcome to WishListSharer!\n\nBe sure to invite your friends to join as well as a wish list is no fun if no one uses it.")
                            .then()
                            .catch(error => 
                                {
                                    console.error(error);
                                    cb(error);
                                }
                            );
                                
            });
    
            cb(null, "Handled");
        } catch(ex) {
            console.error(ex);
            cb(ex);
        }
    })();
});
