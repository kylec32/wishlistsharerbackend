import { UserRepository } from "./UserRepository";
import { Present } from "../models/Present";
import { EmailService } from "./EmailService";

export class UserNotificationService {
    private userRepository: UserRepository;
    private emailService: EmailService;

    constructor() {
        this.userRepository = new UserRepository();
        this.emailService = new EmailService();
    }

    async notifyPurchaserOfChange(presentUserId: string, presentId: string, present: Present) {
        const user = await this.userRepository.getUserById(presentUserId);

        const filteredUserPresents = user.presents.filter(present => present.id == presentId);

        if(filteredUserPresents.length == 1) {
            const userPresent = filteredUserPresents[0];

            if(userPresent.purchasedById != null) {
                const purchasingUser = await this.userRepository.getUserById(userPresent.purchasedById);

                this.emailService.sendHtmlMessage(purchasingUser.user_name, "Purchased Present Changed",`
                A gift that you purchased for ${user.first_name} ${user.last_name} has had it's information changed.
                <br/>
                <br/>
                New Present: <a href="${present.url}">${present.title}</a>
                `).then(result => console.log(`Email sent on change to package: ${presentId}`))
                .catch(error => {
                    console.error("Error sending email for changed present");
                    console.error(error);
                });
            }
        }
    }

    async notifyPurchaserOfDelete(listUserId: string, deletedPresent: Present) {
        if(deletedPresent.purchasedById != null) {
            const listUser = await this.userRepository.getUserById(listUserId);
            const purchasingUser = await this.userRepository.getUserById(deletedPresent.purchasedById);

            this.emailService.sendHtmlMessage(purchasingUser.user_name, "Purchased Present Removed",`
            A gift that you purchased for ${listUser.first_name} ${listUser.last_name} has been removed from their list.
            <br/>
            <br/>
            Removed Present: <a href="${deletedPresent.url}">${deletedPresent.title}</a>
            `).then(result => console.log(`Email sent on delete to package: ${deletedPresent.id}`))
            .catch(error => {
                console.error("Error sending email for changed present");
                console.error(error);
            });
        }
    }

    async notifyFollowersOfNewPresent(listUserId: string, newPresent: Present) {
        const listUser = await this.userRepository.getUserById(listUserId);
        const users = await this.userRepository.usersThatFollowUserId(listUserId);
        
        users.forEach(user => {
            this.emailService.sendHtmlMessage(user.user_name, "New Wish List Item for Person you Follow",
            `
            ${listUser.first_name} ${listUser.last_name} just added a new gift to their list!
            <br/>
            <br/>
            New Item: <a href="${newPresent.url}">${newPresent.title}</a>
            `)
        });
    }
}

