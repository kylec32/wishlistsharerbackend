import { UserRepository } from "../UserRepository";
import { Present } from "../models/Present";
import { EmailService } from "../EmailService";

export class UserNotificationService {
    private userRepository: UserRepository;
    private emailService: EmailService;

    constructor() {
        this.userRepository = new UserRepository();
        this.emailService = new EmailService();
    }

    async notifyPurchaserOfChange(presentUserId: string, presentId: string, present: Present) {
        const user = await this.userRepository.getUserById(presentUserId);
    
        const filteredUserPresents = user.presents.filter(present => present.id != presentId);
    
        if(filteredUserPresents.length == 1) {
            const userPresent = filteredUserPresents[0];
    
            if(userPresent.purchasedById != undefined) {
                const purchasingUser = await this.userRepository.getUserById(userPresent.purchasedById);

                this.emailService.sendHtmlMessage(purchasingUser.user_name, "Purchased Present Changed",`
                A gift that you purchased for ${user.first_name} ${user.last_name} has had it's information changed.

                New Present Name: <a href="${present.url}">${present.title}</a>
                `);
            }
        }
    }
}

