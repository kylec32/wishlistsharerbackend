import { DynamoDBStreamEvent, Callback, Context, Handler, APIGatewayEvent } from 'aws-lambda';
import { Utils } from '../utils/Utils';
import { EmailService } from '../services/EmailService';
import { EventStore } from '../services/EventStore';
var iopipe = require('@iopipe/iopipe')({ token: process.env.IOPIPE_TOKEN });


const eventStore = new EventStore();
const emailService: EmailService = new EmailService();
export const handleNewUser: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            
            Utils.filterEventStream('signed-up', event, (data, sourceRecord) => {
                emailService.sendTextMessage(data.user_name, "Welcome to WishListSharer.tk", "Welcome to WishListSharer!\n\nBe sure to invite your friends to join as well as a wish list is no fun if no one uses it.")
                            .then(value => eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, "welcome-email-sent", value))
                            .catch(error => 
                                {
                                    eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, "welcome-email-unsuccessfully-sent", {})
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

export const handleForgottenPassword: Handler = iopipe((event: DynamoDBStreamEvent, context: Context, cb: Callback) => {
    (async () => {
        try {
            Utils.filterEventStream('forgotten-password', event, (data, sourceRecord) => {
                const resetUrl = `https://wishlistsharer.tk/reset/${data.email}/${data.token}`;
                emailService.sendHtmlMessage(data.email,
                                            "Forgotten Password: WishListSharer.tk",
                                            `A request for a password reset has been made for your account. If you did not make this request there is no action to be taken.<br/><br/>If you did request this reset please follow this link: <a href="${resetUrl}">${resetUrl}</a><br/><br/>This link will expire in 15 minutes.`)
                            .then(value => eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, "forgotten-password-email-sent", value))
                            .catch(error => 
                                {
                                    eventStore.publish(Utils.getEvent(sourceRecord).CorrelationId, "forgotten-password-email-unsuccessfully-sent", {});
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
