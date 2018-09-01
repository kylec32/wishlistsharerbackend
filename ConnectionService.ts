import { FollowedUser } from './models/FollowedUser';
import { UserRepository } from './UserRepository';

export class ConnectionService {

    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    async connectUser(sourceUserId: string, targetUserEmail: string): Promise<any> {
        const targetUserPromise = this.userRepository.getUser(targetUserEmail);
        const sourceUserPromise = this.userRepository.getUserById(sourceUserId);

        const [targetUser, sourceUser] = await Promise.all([targetUserPromise, sourceUserPromise]);

        sourceUser.followingUserIds = sourceUser.followingUserIds == undefined ? [] : sourceUser.followingUserIds;

        if(sourceUser.followingUserIds
                .filter((followingUserId) => followingUserId == targetUser.id).length == 0) {
            sourceUser.followingUserIds = [...sourceUser.followingUserIds, targetUser.id]
        }

        this.userRepository.updateUser(sourceUser);
    }

    async getFollowees(sourceUserId: string): Promise<FollowedUser[]> {
        const sourceUser = await this.userRepository.getUserById(sourceUserId);

        console.log("Following People");
        console.log(sourceUser);

        const followedList = await this.userRepository.getUserByIds(sourceUser.followingUserIds == undefined ? [] : sourceUser.followingUserIds);


        const followedUserList = followedList.map((followed) => <FollowedUser>{
                                            'id': followed.id,
                                            'name': `${followed.first_name} ${followed.last_name}`
                                        });
        

        return followedUserList;
    }

    async disconnectFollowee(sourceUserId: string, targetUserId: string): Promise<void> {
        const sourceUser = await this.userRepository.getUserById(sourceUserId);

        sourceUser.followingUserIds = sourceUser.followingUserIds == undefined ? [] : sourceUser.followingUserIds;

        sourceUser.followingUserIds = sourceUser.followingUserIds
        .filter((followingUserId) => followingUserId != targetUserId)

        await this.userRepository.updateUser(sourceUser);
    }
}