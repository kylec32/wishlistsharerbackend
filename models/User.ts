import { Present } from './Present';

export interface User {
    user_name: string,
    first_name: string,
    id: string,
    last_name: string,
    password: string,
    followingUserIds?: string[],
    presents?: Present[]
}