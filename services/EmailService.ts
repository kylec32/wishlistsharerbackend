import * as request from 'request';

export class EmailService {

    async sendTextMessage(to: string, subject: string, body: string): Promise<any> {

        this.sendMessage(
        {
            "Messages":[
              {
                "From": {
                  "Email": "noreply@scaledcode.com",
                  "Name": "WishlistSharer"
                },
                "To": [
                  {
                    "Email": to
                  }
                ],
                "Subject": subject,
                
                "TextPart": body
              }
            ]
          });
    }

    async sendHtmlMessage(to: string, subject: string, body: string): Promise<any> {
        this.sendMessage(
            {
                "Messages":[
                  {
                    "From": {
                      "Email": "noreply@scaledcode.com",
                      "Name": "WishlistSharer"
                    },
                    "To": [
                      {
                        "Email": to
                      }
                    ],
                    "Subject": subject,
                    "HTMLPart": body
                  }
                ]
              });
    }

    private async sendMessage(body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            request.post('https://api.mailjet.com/v3.1/send', {
                'auth': {
                    'user': '30a23f52f366cf26048627a52171dbc4',
                    'password': process.env.MAILGUN_API_KEY
                },
                'body': JSON.stringify(body)
            }, (error: any, response: request.Response, body: any) => {
                if(error) {
                    reject(error);
                }

                resolve(body);
            });
        });   
    }
}