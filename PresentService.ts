import { UserRepository } from "./UserRepository";
import { Present } from "./models/Present";
import { PresentView } from "./models/PresentView"; 
import * as uuid from 'uuid/v1';
import { FollowedPresentsView } from "./models/FollowedPresentsView";
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
        present.addedDateTime = new Date().toISOString().toString();

        user.presents.push(present);

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

        let presents = user.presents == null ? [] : user.presents;

        presents = presents.map(present => { 
            present.addedDateTime = present.addedDateTime == undefined ? "": present.addedDateTime;
            return present;
        });

        return presents.sort((present1: Present, present2: Present) => present1.addedDateTime.localeCompare(present2.addedDateTime))
                .map((present) => <PresentView>{
            "id": present.id,
            "title": present.title,
            "url": present.url
        });
    }

    async getFollowedUserPresents(userId: string): Promise<FollowedPresentsView[]> {
        const sourceUser = await this.userRepository.getUserById(userId);

        const followedList = await this.userRepository.getUserByIds(sourceUser.followingUserIds == undefined ? [] : sourceUser.followingUserIds);

        return followedList.map(followed => {
            return <FollowedPresentsView>{
                'id': followed.id,
                'name': `${followed.first_name} ${followed.last_name}`,
                'presents': this.getPresentsForFollowed(followed.presents == undefined ? [] : followed.presents, userId),
            }
        });
    } 

    private getPresentsForFollowed(presents: Present[], currentUserId: string): FollowedPresentView[] {
        return presents.map(present => { 
            present.addedDateTime = present.addedDateTime == undefined ? "": present.addedDateTime;
            return present;
        }).sort((present1: Present, present2: Present) => present1.addedDateTime.localeCompare(present2.addedDateTime))
        .map(present => {
            return this.populateFullFollowedPresentData(present, currentUserId);
        });
    }

    private populateFullFollowedPresentData(present: Present, currentUserId: string): FollowedPresentView {
        return <FollowedPresentView> {
            "id": present.id,
            "title": present.title,
            "url": present.url,
            "imageUrl": present.imageUrl,
            "purchased": present.purchasedById != undefined,
            "purchasedByUser": present.purchasedById != undefined && present.purchasedById == currentUserId
        }
    }

    async deletePresent(userId: string, presentId: string): Promise<any> {
        const user = await this.userRepository.getUserById(userId);

        user.presents = user.presents == null ? [] : user.presents;

        user.presents = user.presents.filter((present) => present.id != presentId);

        await this.userRepository.updateUser(user);
    }

    async markPresentAsPurchased(userId: string, targetUserId: string, presentId: string): Promise<any> {
        const user = await this.userRepository.getUserById(targetUserId);

        let presents = user.presents == undefined ? [] : user.presents;

        const presentToUpdateList = presents.filter(present => present.id == presentId);

        if(presentToUpdateList.length != 1) {
            throw Error("Present not found");
        }

        const presentToUpdate = presentToUpdateList[0];

        if(presentToUpdate.purchasedById != undefined
            && presentToUpdate.purchasedById != null
            && presentToUpdate.purchasedById != userId) {
            throw new Error("Present is already purchased by someone else.");
        }

        presentToUpdate.purchasedById = userId;

        presents = [...presents.filter(present => present.id != presentId), presentToUpdate]

        user.presents = presents;

        this.userRepository.updateUser(user);
    }

    async unmarkPresentAsPurchased(userId: string, targetUserId: string, presentId: string): Promise<any> {
        const user = await this.userRepository.getUserById(targetUserId);

        let presents = user.presents == undefined ? [] : user.presents;

        const presentToUpdateList = presents.filter(present => present.id == presentId);

        if(presentToUpdateList.length != 1) {
            throw Error("Present not found");
        }

        const presentToUpdate = presentToUpdateList[0];

        if(presentToUpdate.purchasedById != userId) {
            return;
        }

        presentToUpdate.purchasedById = null;

        presents = [...presents.filter(present => present.id != presentId), presentToUpdate]

        user.presents = presents;

        this.userRepository.updateUser(user);
    }

}