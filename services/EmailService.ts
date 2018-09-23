import * as request from 'request';

export class EmailService {

    async sendTextMessage(to: string, subject: string, body: string): Promise<any> {
        this.sendMessage({
            from: 'no-reply@mail.wishlistsharer.tk',
            to: to,
            subject: subject,
            text: body
        });
    }

    async sendHtmlMessage(to: string, subject: string, body: string): Promise<any> {
        this.sendMessage({
            from: 'no-reply@mail.wishlistsharer.tk',
            to: to,
            subject: subject,
            html: body
        });
    }

    private async sendMessage(form: any): Promise<any> {
        return new Promise((resolve, reject) => {
            request.post('https://api.mailgun.net/v3/mail.wishlistsharer.tk/messages', {
                'auth': {
                    'user': 'api',
                    'password': process.env.MAILGUN_API_KEY
                },
                'form': form
            }, (error: any, response: request.Response, body: any) => {
                if(error) {
                    reject(error);
                }

                resolve(body);
            });
        });   
    }
}