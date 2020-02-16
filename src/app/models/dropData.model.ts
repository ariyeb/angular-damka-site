import { Player } from './player.model';

export interface DropData {
    toPlayer: Player;
    exitId: number;
    droppedId: number;
}