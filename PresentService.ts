import { UserRepository } from "./UserRepository";
import { Present } from "./models/Present";
import { PresentView } from "./models/PresentView"; 
import * as uuid from 'uuid/v1';
import { FollowedPresentView } from "./models/FollowedPresentView";

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

        console.log("Right before update");
        console.log(user);

        await this.userRepository.updateUser(user);
    }

    async updatePresent(userId: string, presentId: string, present: Present): Promise<any> {
        const user = await this.userRepository.getUserById(userId);

        user.presents = user.presents == null ? [] : user.presents;

        user.presents = user.presents.filter((present) => present.id != presentId);

        present.id = presentId;

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

    async getFollowedUserPresents(userId: string): Promise<FollowedPresentView[]> {
        const sourceUser = await this.userRepository.getUserById(userId);

        const followedList = await this.userRepository.getUserByIds(sourceUser.followingUserIds == undefined ? [] : sourceUser.followingUserIds);

        return followedList.map(followed => {
            return <FollowedPresentView>{
                'id': followed.id,
                'name': `${followed.first_name} ${followed.last_name}`,
                'presents': followed.presents == undefined ? [] : followed.presents
            }
        });
    } 

    async deletePresent(userId: string, presentId: string): Promise<any> {
        const user = await this.userRepository.getUserById(userId);

        user.presents = user.presents == null ? [] : user.presents;

        user.presents = user.presents.filter((present) => present.id != presentId);

        await this.userRepository.updateUser(user);
    }
}