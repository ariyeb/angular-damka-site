export class Piece {
    constructor(
        private isBlue: boolean,
        private isKing: boolean,
        private isCanMove: boolean,
        private imgSrc: string) {}

    getIsBlue() {
        return this.isBlue;
    }

    getIsKing() {
        return this.isKing;
    }

    setIsKing(isKing: boolean) {
        this.isKing = isKing;
    }

    getImgSrc() {
        return this.imgSrc;
    }

    setImgSrc(imgSrc: string) {
        this.imgSrc = imgSrc;
    }

    getIsCanMove() {
        return this.isCanMove;
    }

    setIsCanMove(isCanMove: boolean) {
        this.isCanMove = isCanMove;
    }

    // getPosition() {
    //     return this.position;
    // }

    // setPosition(position: number) {
    //     this.position = position;
    // }
}