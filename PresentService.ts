import { UserRepository } from "./UserRepository";
import { Present } from "./models/Present";
import { PresentView } from "./models/PresentView"; 
import * as uuid from 'uuid/v1';

export class PresentService {

    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    async addPresent(userId: string, present: Present): Promise<any> {
        const user = await this.userRepository.getUserById(userId);

        user.presents = user.presents == null ? [] : user.presents;

        present.id = uuid();

        user.presents.push(present);

        await this.userRepository.updateUser(user);
    }

    async getUserPresents(userId: string): Promise<PresentView[]> {
        const user = await this.userRepository.getUserById(userId);

        const presents = user.presents == null ? [] : user.presents;

        return presents.map((present) => <PresentView>{
            "id": present.id,
            "title": present.title,
            "url": present.url
        });
    }

    async deletePresent(userId: string, presentId: string): Promise<any> {
        const user = await this.userRepository.getUserById(userId);

        user.presents = user.presents == null ? [] : user.presents;

        user.presents = user.presents.filter((present) => present.id != presentId);

        await this.userRepository.updateUser(user);
    }
}