import { Player } from './player.model';

export interface MoveDoneData {
    toPlayer: Player;
    erasedPieces: number[];
    pieceIndexToCrown: number;
    isVictory: boolean;
    redPiecesCount: number;
    bluePiecesCount: number;
}