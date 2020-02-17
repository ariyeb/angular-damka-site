import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';

import { Piece } from '../models/piece.model';
import { PotentialJump } from '../models/PotentialJump.model';
import { SocketioService } from '../services/socketio.service';
import { Player } from '../models/player.model';
import { DropData } from '../models/dropData.model';
import { MoveDoneData } from '../models/moveDoneData.model';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  BLUE_PIECE_IMG_SRC: string = "../../assets/images/piece-blue.png";
  RED_PIECE_IMG_SRC: string = "../../assets/images/piece-red.png";
  BLUE_KING_PIECE_IMG_SRC: string = "../../assets/images/piece-blue-king.png";
  RED_KING_PIECE_IMG_SRC: string = "../../assets/images/piece-red-king.png";
  RED_STYLE: string = "0.5vw solid #b97a57";
  BLUE_STYLE: string = "0.5vw solid #00a2e8";
  OUTLINE_STYLE: string;
  pieces: Piece[][] = [];
  // squaresOpenForMovement: number[] = [];
  exitedId: number;
  droppedId: number;
  pieceJourney: number[] = [];
  isBluePlaying: boolean;
  redPiecesCount: number;
  bluePiecesCount: number;
  isFirstMove: boolean;
  isPieceCatured: boolean;
  isButtonDoneDisabled: boolean;
  capturedPieces: number[] = [];
  potentialJumps: PotentialJump[] = [];
  @ViewChild('modalButton', { static: false }) modalButton: ElementRef;
  @ViewChild('buttonLaunchLeavingModal', { static: false }) buttonLaunchLeavingModal: ElementRef;
  modalMessage: string;
  isBlueMyColor: Boolean;
  myPlayerData: Player;
  opponentData: Player;
  dropDataSub: Subscription;
  moveDoneDataSub: Subscription;
  opponentLeftSub: Subscription;
  tieSub: Subscription;
  blueMovesCounter: number;
  movesCounter: number;
  isGameEnded: boolean;

  constructor(
    private socketioSrvice: SocketioService,
    private loginService: LoginService,
    private router: Router) { }

  ngOnInit() {
    this.isButtonDoneDisabled = true;
    this.isBluePlaying = true;
    this.isFirstMove = true;
    this.isPieceCatured = false;
    this.redPiecesCount = 12;
    this.bluePiecesCount = 12;
    this.isBlueMyColor = this.socketioSrvice.getIsBlue();
    this.myPlayerData = this.socketioSrvice.getPlayer();
    this.opponentData = this.socketioSrvice.getOpponent();
    this.setOutlineStyle();
    this.movesCounter = 0;
    this.isGameEnded = false;

    this.dropDataSub = this.socketioSrvice.getDropData_Subject.subscribe((dropData: DropData) => {
      let tempPiece = this.pieces[dropData.exitId][0];
      this.pieces[dropData.exitId] = [];
      this.pieces[dropData.droppedId].push(tempPiece);
    });

    this.moveDoneDataSub = this.socketioSrvice.getMoveDoneData_Subject.subscribe((moveDoneData: MoveDoneData) => {
      if (moveDoneData.pieceIndexToCrown !== -1) {
        this.crownPieceIfItEnterTheKingsRow(moveDoneData.pieceIndexToCrown);
      }
      this.redPiecesCount = moveDoneData.redPiecesCount;
      this.bluePiecesCount = moveDoneData.bluePiecesCount;
      for (let i of moveDoneData.erasedPieces) {
        this.pieces[i] = [];
      }

      if (moveDoneData.isVictory) {
        this.cheackIsWasAVictory();
      } else {
        this.isBluePlaying = !this.isBluePlaying;
        const isPotentialMove: boolean = this.enableToMovementPotentialPieces();
        this.setOutlineStyle();
        if (!isPotentialMove) {
          if (moveDoneData.isOpponentCantMove) {
            this.modalMessage = "TIE!"
            this.modalButton.nativeElement.click();
            this.blockAllPieces();
          } else {
            this.socketioSrvice.emitMoveDone({ toPlayer: this.opponentData, erasedPieces: [], pieceIndexToCrown: -1, isVictory: false, redPiecesCount: this.redPiecesCount, bluePiecesCount: this.bluePiecesCount, isOpponentCantMove: true });
            this.resetFieldsForNextTurn();
          }

        }
      }
    });

    this.opponentLeftSub = this.socketioSrvice.opponentLeftSubject.subscribe(() => {
      if (!this.isGameEnded) {
        this.modalMessage = this.opponentData.userName + " left the game";
        this.modalButton.nativeElement.click();
      }
      this.blockAllPieces();
    });

    this.tieSub = this.socketioSrvice.tieSubject.subscribe(() => {
      this.modalMessage = "Tie!"
      this.modalButton.nativeElement.click();
      this.blockAllPieces();
    });

    for (let i = 0; i < 12; i++) {
      this.pieces.push([new Piece(false, false, false, this.RED_PIECE_IMG_SRC)]);
    }
    for (let i = 0; i < 8; i++) {
      this.pieces.push([]);
    }
    for (let i = 0; i < 12; i++) {
      this.pieces.push([new Piece(true, false, false, this.BLUE_PIECE_IMG_SRC)]);
    }
    if (this.isBlueMyColor) {
      this.enableToMovementPotentialPieces();
    }
  }

  ngOnDestroy() {
    this.dropDataSub.unsubscribe();
    this.moveDoneDataSub.unsubscribe();
    this.tieSub.unsubscribe();
    this.opponentLeftSub.unsubscribe();

    this.socketioSrvice.emitPlayerLeftTheGame();
  }

  /////////////////////////////////////////////////////////////////////
  // Events functions
  /////////////////////////////////////////////////////////////////////
  onPieceExitSquare(event) {
    // this.exitedId = this.idToIndex(event.source.dropContainer.id);
    this.exitedId = +(event.source.dropContainer.id);

    if (this.isFirstMove) {
      this.pieceJourney.push(this.exitedId);
      this.blockNonePlayingPieces();
    }

    console.log("exited:", this.exitedId);
  }

  isSquareAvailableToDrop = (item: CdkDrag<Piece>, dropList: CdkDropList<Piece[]>) => {
    if (dropList.data.length !== 0) {
      return false;
    }

    return this.isSquareSuitableForMove(+(dropList.id));
  }

  onDrop(event: CdkDragDrop<Piece[]>) {
    if (event.previousContainer === event.container) {
      return moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    transferArrayItem(event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex);

    // this.droppedId = this.idToIndex(event.container.id);
    this.droppedId = +(event.container.id);
    this.pieceJourney.push(this.droppedId);
    if (this.isFirstMove) {
      this.isFirstMove = false;
    }
    this.setIsPieceCaptured();
    this.isButtonDoneDisabled = false;

    console.log("dropped:", this.droppedId);
    this.socketioSrvice.emitDropData({ toPlayer: this.opponentData, exitId: this.exitedId, droppedId: this.droppedId });
  }

  onClickButtonDone() {
    // console.log("Captured Pieces:", this.capturedPieces);
    // console.log("Potential Jumps:", this.potentialJumps);

    let { isPiecesHuffed, erasedPieces, isPlayerPieceHuffed } = this.CheackIsPiecesCouldHaveJumpInThisTurnAndHuffThem();
    if (isPiecesHuffed) {
      if (!isPlayerPieceHuffed) {
        this.pieces[this.droppedId][0].setIsCanMove(false);
        this.removePieces(this.capturedPieces);
        erasedPieces = erasedPieces.concat(this.capturedPieces);
      }
      if (!this.cheackIsWasAVictory()) {
        this.socketioSrvice.emitMoveDone({ toPlayer: this.opponentData, erasedPieces: erasedPieces, pieceIndexToCrown: -1, isVictory: false, redPiecesCount: this.redPiecesCount, bluePiecesCount: this.bluePiecesCount, isOpponentCantMove: false });
        this.resetFieldsForNextTurn();
        return;
      }
    }

    const pieceIndexToCrown: number = this.crownPieceIfItEnterTheKingsRow(this.droppedId);
    this.pieces[this.droppedId][0].setIsCanMove(false);
    this.removePieces(this.capturedPieces);
    if (!this.cheackIsWasAVictory()) {
      this.socketioSrvice.emitMoveDone({ toPlayer: this.opponentData, erasedPieces: this.capturedPieces, pieceIndexToCrown, isVictory: false, redPiecesCount: this.redPiecesCount, bluePiecesCount: this.bluePiecesCount, isOpponentCantMove: false });
      this.resetFieldsForNextTurn();
      return;
    }

    // victory
    this.socketioSrvice.emitMoveDone({ toPlayer: this.opponentData, erasedPieces: this.capturedPieces, pieceIndexToCrown, isVictory: true, redPiecesCount: this.redPiecesCount, bluePiecesCount: this.bluePiecesCount, isOpponentCantMove: false });
  }

  onClickButtonLeaveTheGame() {
    this.buttonLaunchLeavingModal.nativeElement.click();
    this.router.navigate(['/main/choose-player']);
  }

  onClickButtonNewGame() {
    this.modalButton.nativeElement.click()
    this.router.navigate(['/main/choose-player']);
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // Utills
  /////////////////////////////////////////////////////////////////////////////////////////////////

  // idToIndex(id: string) {
  //   let idNum = id.substring(id.length - 2);
  //   if (idNum[0] === "-") {
  //     idNum = idNum[1];
  //   }
  //   return +idNum;
  // }

  resetFieldsForNextTurn() {
    this.movesCounter++;
    this.isPieceCatured = false;
    this.isFirstMove = true;
    this.pieceJourney = [];
    this.capturedPieces = [];
    this.potentialJumps = [];
    this.isBluePlaying = !this.isBluePlaying;
    this.setOutlineStyle();
    this.blockAllPieces();
    this.isButtonDoneDisabled = true;
  }

  coordinatesToIndex(x: number, y: number) {
    x = ((x % 2) === 0) ? x : x + 1;
    return ((((y - 1) * 8) + x) / 2) - 1;
  }

  indexToCoordinates(index: number) {
    const squareNum = (index + 1) * 2;
    let x = ((squareNum % 8) === 0) ? 8 : (squareNum % 8);
    let y = ((squareNum - x) / 8) + 1;
    x = ((y % 2) === 0) ? (x - 1) : x;
    return { x, y };
  }

  setOutlineStyle() {
    this.OUTLINE_STYLE = this.isBluePlaying ? this.BLUE_STYLE : this.RED_STYLE;
  }

  isIndexInEvenRow(i: number) {
    return Math.floor(i / 4) % 2 === 0;
  }

  // Game logic Fuctions
  blockNonePlayingPieces() {
    for (let i = 0; i < this.pieces.length; i++) {
      if (i !== this.exitedId && this.pieces[i].length !== 0 && this.pieces[i][0].getIsBlue() === this.isBluePlaying) {
        this.pieces[i][0].setIsCanMove(false);
      }
    }
  }

  enableToMovementPotentialPieces() {
    let isPieceCanMoveOrJump: boolean = false;
    for (let i = 0; i < this.pieces.length; i++) {
      if (
        this.pieces[i].length !== 0 &&
        this.pieces[i][0].getIsBlue() === this.isBluePlaying &&
        this.isPieceCanMoveOrJumpInFirstMove(i)
      ) {
        this.pieces[i][0].setIsCanMove(true);
        isPieceCanMoveOrJump = true;
      }
    }

    return isPieceCanMoveOrJump;
  }

  isPieceCanMoveOrJumpInFirstMove(index: number) {
    const thePiece = this.pieces[index][0];
    const { x, y } = this.indexToCoordinates(index);

    const isBluePieceCanMove = (index: number) => {
      if (y >= 2) {
        if (
          x <= 7 &&
          this.pieces[this.coordinatesToIndex(x + 1, y - 1)].length === 0) {
          return true;
        }

        if (
          x >= 2 &&
          this.pieces[this.coordinatesToIndex(x - 1, y - 1)].length === 0) {
          return true;
        }
      }
      return false;
    }
    const isRedPieceCanMove = (index: number) => {
      if (y <= 7) {
        if (
          x <= 7 &&
          this.pieces[this.coordinatesToIndex(x + 1, y + 1)].length === 0) {
          return true;
        }

        if (
          x >= 2 &&
          this.pieces[this.coordinatesToIndex(x - 1, y + 1)].length === 0) {
          return true;
        }
      }
      return false;
    }

    if (this.isPieceCanJumpInFirstMove(index)) {
      return true;
    }

    if (thePiece.getIsKing()) {
      return (isBluePieceCanMove(index) || isRedPieceCanMove(index));
    }

    return thePiece.getIsBlue() ? isBluePieceCanMove(index) : isRedPieceCanMove(index);
  }

  isPieceCanJumpInFirstMove(index: number) {
    const thePiece = this.pieces[index][0];
    const { x, y } = this.indexToCoordinates(index);

    if (thePiece.getIsKing()) {
      return this.iskingCanJumpOrPieceThroughJourney(index);
    }

    let isPieceCanJump: boolean = false;
    // can blue jump?
    if (thePiece.getIsBlue() && y >= 3) {
      // can blue jump right?
      if (
        x <= 6 &&
        this.pieces[this.coordinatesToIndex(x + 1, y - 1)].length === 1 &&
        !this.pieces[this.coordinatesToIndex(x + 1, y - 1)][0].getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x + 2, y - 2)].length === 0
      ) {
        this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x + 1, y - 1) });
        isPieceCanJump = true;
      }
      // can blue jump left?
      if (
        x >= 3 &&
        this.pieces[this.coordinatesToIndex(x - 1, y - 1)].length === 1 &&
        !this.pieces[this.coordinatesToIndex(x - 1, y - 1)][0].getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x - 2, y - 2)].length === 0
      ) {
        this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x - 1, y - 1) });
        isPieceCanJump = true;
      }

      return isPieceCanJump;
    }

    // can red jump?
    if (!thePiece.getIsBlue() && y <= 6) {
      // can red jump right?
      if (
        x <= 6 &&
        this.pieces[this.coordinatesToIndex(x + 1, y + 1)].length === 1 &&
        this.pieces[this.coordinatesToIndex(x + 1, y + 1)][0].getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x + 2, y + 2)].length === 0
      ) {
        this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x + 1, y + 1) });
        isPieceCanJump = true;
      }

      // can red jump left?
      if (
        x >= 3 &&
        this.pieces[this.coordinatesToIndex(x - 1, y + 1)].length === 1 &&
        this.pieces[this.coordinatesToIndex(x - 1, y + 1)][0].getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x - 2, y + 2)].length === 0
      ) {
        this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x - 1, y + 1) });
        isPieceCanJump = true;
      }

      return isPieceCanJump;
    }

    return false;
  }

  iskingCanJumpOrPieceThroughJourney(index: number) {
    const thePiece = this.pieces[index][0];
    const { x, y } = this.indexToCoordinates(index);
    let isPieceCanJump: boolean = false;

    // in case was a journey
    let lastCapturedPieceCoordidnates = { x: -1, y: -1 };
    if (this.isPieceCatured) {
      lastCapturedPieceCoordidnates = this.indexToCoordinates(this.capturedPieces[this.capturedPieces.length - 1]);
    }
    const lastCapturedPieceX = lastCapturedPieceCoordidnates.x;
    const lastCapturedPieceY = lastCapturedPieceCoordidnates.y;

    // Cheacking can jump down?
    if (y <= 6) {
      if (
        x <= 6 &&
        this.pieces[this.coordinatesToIndex(x + 1, y + 1)].length === 1 &&
        this.pieces[this.coordinatesToIndex(x + 1, y + 1)][0].getIsBlue() !== thePiece.getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x + 2, y + 2)].length === 0
      ) {
        if (this.isPieceCatured) {
          if (lastCapturedPieceX !== x + 1 || lastCapturedPieceY !== y + 1) {
            return true;
          }
        } else {
          this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x + 1, y + 1) });
          isPieceCanJump = true;
        }
      }

      if (
        x >= 3 &&
        this.pieces[this.coordinatesToIndex(x - 1, y + 1)].length === 1 &&
        this.pieces[this.coordinatesToIndex(x - 1, y + 1)][0].getIsBlue() !== thePiece.getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x - 2, y + 2)].length === 0
      ) {
        if (this.isPieceCatured) {
          if (lastCapturedPieceX !== x - 1 || lastCapturedPieceY !== y + 1) {
            return true;
          }
        } else {
          this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x - 1, y + 1) });
          isPieceCanJump = true;
        }
      }
    }

    // cheacking can jump up?
    if (y >= 3) {
      if (
        x <= 6 &&
        this.pieces[this.coordinatesToIndex(x + 1, y - 1)].length === 1 &&
        this.pieces[this.coordinatesToIndex(x + 1, y - 1)][0].getIsBlue() !== thePiece.getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x + 2, y - 2)].length === 0
      ) {
        if (this.isPieceCatured) {
          if (lastCapturedPieceX !== x + 1 || lastCapturedPieceY !== y - 1) {
            return true;
          }
        } else {
          this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x + 1, y - 1) });
          isPieceCanJump = true;
        }
      }

      if (
        x >= 3 &&
        this.pieces[this.coordinatesToIndex(x - 1, y - 1)].length === 1 &&
        this.pieces[this.coordinatesToIndex(x - 1, y - 1)][0].getIsBlue() !== thePiece.getIsBlue() &&
        this.pieces[this.coordinatesToIndex(x - 2, y - 2)].length === 0
      ) {
        if (this.isPieceCatured) {
          if (lastCapturedPieceX !== x - 1 || lastCapturedPieceY !== y - 1) {
            return true;
          }
        } else {
          this.potentialJumps.push({ fromIndex: index, opponentIndex: this.coordinatesToIndex(x - 1, y - 1) });
          isPieceCanJump = true;
        }
      }
    }

    return isPieceCanJump;
  }


  isSquareSuitableForMove(toIndex: number) {
    if (!this.isFirstMove && !this.isPieceCatured) {
      return false;
    }

    const toCoordinates = this.indexToCoordinates(toIndex);
    const toX = toCoordinates.x;
    const toY = toCoordinates.y;
    const fromCoordinates = this.indexToCoordinates(this.exitedId);
    const fromX = fromCoordinates.x;
    const fromY = fromCoordinates.y;

    if (this.pieces[this.exitedId][0].getIsKing()) {
      if (Math.abs(toX - fromX) !== Math.abs(toY - fromY)) {
        return false;
      }

      let tempPiece: Piece[];
      let piecesCount: number;
      let pieceIndex: number;

      if (toX > fromX && toY < fromY) {
        piecesCount = 0;
        for (let x = fromX + 1, y = fromY - 1; x < toX; x++ , y--) {
          pieceIndex = this.coordinatesToIndex(x, y);
          tempPiece = this.pieces[pieceIndex];
          if (tempPiece.length === 0) {
            continue;
          }
          if (tempPiece[0].getIsBlue() === this.isBluePlaying) {
            return false;
          }
          piecesCount++;
          if (piecesCount > 1) {
            return false;
          }

          if (
            this.capturedPieces.length > 0 &&
            pieceIndex === this.capturedPieces[this.capturedPieces.length - 1]
          ) {
            return false;
          }
        }

        if (this.isPieceCatured && piecesCount === 0) {
          return false;
        }

        return true;
      }

      if (toX < fromX && toY < fromY) {
        piecesCount = 0;
        for (let x = fromX - 1, y = fromY - 1; x > toX; x-- , y--) {
          pieceIndex = this.coordinatesToIndex(x, y);
          tempPiece = this.pieces[pieceIndex];
          if (tempPiece.length === 0) {
            continue;
          }
          if (tempPiece[0].getIsBlue() === this.isBluePlaying) {
            return false;
          }
          piecesCount++;
          if (piecesCount > 1) {
            return false;
          }

          if (
            this.capturedPieces.length > 0 &&
            pieceIndex === this.capturedPieces[this.capturedPieces.length - 1]
          ) {
            return false;
          }
        }

        if (this.isPieceCatured && piecesCount === 0) {
          return false;
        }

        return true;
      }

      if (toX > fromX && toY > fromY) {
        piecesCount = 0;
        for (let x = fromX + 1, y = fromY + 1; x < toX; x++ , y++) {
          pieceIndex = this.coordinatesToIndex(x, y);
          tempPiece = this.pieces[pieceIndex];
          if (tempPiece.length === 0) {
            continue;
          }
          if (tempPiece[0].getIsBlue() === this.isBluePlaying) {
            return false;
          }
          piecesCount++;
          if (piecesCount > 1) {
            return false;
          }

          if (
            this.capturedPieces.length > 0 &&
            pieceIndex === this.capturedPieces[this.capturedPieces.length - 1]
          ) {
            return false;
          }
        }

        if (this.isPieceCatured && piecesCount === 0) {
          return false;
        }

        return true;
      }

      if (toX < fromX && toY > fromY) {
        piecesCount = 0;
        for (let x = fromX - 1, y = fromY + 1; x > toX; x-- , y++) {
          pieceIndex = this.coordinatesToIndex(x, y);
          tempPiece = this.pieces[pieceIndex];
          if (tempPiece.length === 0) {
            continue;
          }
          if (tempPiece[0].getIsBlue() === this.isBluePlaying) {
            return false;
          }
          piecesCount++;
          if (piecesCount > 1) {
            return false;
          }

          if (
            this.capturedPieces.length > 0 &&
            pieceIndex === this.capturedPieces[this.capturedPieces.length - 1]
          ) {
            return false;
          }
        }

        if (this.isPieceCatured && piecesCount === 0) {
          return false;
        }

        return true;
      }
    }

    const isCanJumpUp = () => {
      let middleSquare;
      if (toX > fromX) {
        middleSquare = this.pieces[this.coordinatesToIndex(toX - 1, toY + 1)];
        if (middleSquare.length !== 0 && middleSquare[0].getIsBlue() !== this.isBluePlaying) {
          return true;
        }
      } else {
        middleSquare = this.pieces[this.coordinatesToIndex(toX + 1, toY + 1)];
        if (middleSquare.length !== 0 && middleSquare[0].getIsBlue() !== this.isBluePlaying) {
          return true;
        }
      }
      return false;
    }

    const isCanJumpDown = () => {
      let middleSquare: Piece[];
      if (toX > fromX) {
        middleSquare = this.pieces[this.coordinatesToIndex(toX - 1, toY - 1)];
        if (middleSquare.length !== 0 && middleSquare[0].getIsBlue() !== this.isBluePlaying) {
          return true;
        }
      } else {
        middleSquare = this.pieces[this.coordinatesToIndex(toX + 1, toY - 1)];
        if (middleSquare.length !== 0 && middleSquare[0].getIsBlue() !== this.isBluePlaying) {
          return true;
        }
      }
      return false;
    }


    if (this.isFirstMove) {
      if (this.isBluePlaying) {
        if (Math.abs(toX - fromX) === 1 && toY - fromY === -1) {
          return true;
        }

        if (Math.abs(toX - fromX) === 2 && toY - fromY === -2) {
          return isCanJumpUp();
        }
        return false;
      } else {
        if (Math.abs(toX - fromX) === 1 && toY - fromY === 1) {
          return true;
        }

        if (Math.abs(toX - fromX) === 2 && toY - fromY === 2) {
          return isCanJumpDown();
        }
        return false;
      }
    }
    if (this.isPieceCatured) {
      if (toIndex === this.pieceJourney[this.pieceJourney.length - 2]) {
        return false;
      }

      if (Math.abs(toX - fromX) === 2 && toY - fromY === -2) {
        return isCanJumpUp();
      }

      if (Math.abs(toX - fromX) === 2 && toY - fromY === 2) {
        return isCanJumpDown();
      }

      return false;
    }

    return false;
  }

  setIsPieceCaptured() {
    let x1, x2, y1, y2;
    let coordinates1, coordinates2;
    coordinates1 = this.indexToCoordinates(this.exitedId);
    x1 = coordinates1.x;
    y1 = coordinates1.y;
    coordinates2 = this.indexToCoordinates(this.droppedId);
    x2 = coordinates2.x;
    y2 = coordinates2.y;
    const thePiece = this.pieces[this.droppedId][0];
    // no piece captured
    if (Math.abs(x2 - x1) === 1) {
      return;
    }
    this.isPieceCatured = true;

    if (!thePiece.getIsKing()) {
      const xMiddle = x1 > x2 ? x1 - 1 : x1 + 1;
      const yMiddle = y1 > y2 ? y1 - 1 : y1 + 1;
      this.capturedPieces.push(this.coordinatesToIndex(xMiddle, yMiddle));
      return;
    }

    if (x1 < x2 && y1 > y2) {
      for (let x = x1 + 1, y = y1 - 1; x < x2; x++ , y--) {
        if (this.pieces[this.coordinatesToIndex(x, y)].length !== 0) {
          this.capturedPieces.push(this.coordinatesToIndex(x, y));
          return;
        }
      }
    }

    if (x1 > x2 && y1 > y2) {
      for (let x = x1 - 1, y = y1 - 1; x > x2; x-- , y--) {
        if (this.pieces[this.coordinatesToIndex(x, y)].length !== 0) {
          this.capturedPieces.push(this.coordinatesToIndex(x, y));
          return;
        }
      }
    }

    if (x1 < x2 && y1 < y2) {
      for (let x = x1 + 1, y = y1 + 1; x < x2; x++ , y++) {
        if (this.pieces[this.coordinatesToIndex(x, y)].length !== 0) {
          this.capturedPieces.push(this.coordinatesToIndex(x, y));
          return;
        }
      }
    }

    if (x1 > x2 && y1 < y2) {
      for (let x = x1 - 1, y = y1 + 1; x > x2; x-- , y++) {
        if (this.pieces[this.coordinatesToIndex(x, y)].length !== 0) {
          this.capturedPieces.push(this.coordinatesToIndex(x, y));
          return;
        }
      }
    }
  }


  removePieces(capturedPieces: number[]) {
    if (capturedPieces.length === 0) {
      return;
    }

    for (let index of capturedPieces) {
      this.pieces[index] = [];
    }
    this.subtractPiecesInPiecesCount(!this.isBluePlaying, capturedPieces.length);
  }

  subtractPiecesInPiecesCount(isBlue: boolean, count: number) {
    if (isBlue) {
      this.bluePiecesCount -= count;
    } else {
      this.redPiecesCount -= count;
    }
  }

  isPieceWentBackwardsThroughJourney() {
    let capturedPiecesCopy: number[];
    let tempPieceIndex: number;
    for (let i = 0; i < this.capturedPieces.length; i++) {
      capturedPiecesCopy = this.capturedPieces.slice();
      tempPieceIndex = this.capturedPieces[i];
      capturedPiecesCopy.splice(i, 1);
      if (capturedPiecesCopy.includes(tempPieceIndex)) {
        return true;
      }
    }
    return false;
  }

  CheackIsPiecesCouldHaveJumpInThisTurnAndHuffThem() {
    let isPlayerPieceHuffed = false;
    let isPiecesHuffed: boolean = false;
    const erasedPieces: number[] = [];
    if (this.isPieceCatured && this.iskingCanJumpOrPieceThroughJourney(this.droppedId)) {
      this.pieces[this.droppedId] = [];
      erasedPieces.push(this.droppedId);
      this.subtractPiecesInPiecesCount(this.isBluePlaying, 1);
      isPiecesHuffed = true;
      isPlayerPieceHuffed = true;
    }

    for (let potentialJump of this.potentialJumps) {
      if (!this.capturedPieces.includes(potentialJump.opponentIndex)) {
        if (this.isPieceCatured && potentialJump.fromIndex === this.pieceJourney[0]) {
          continue;
        }
        if (!this.isPieceCatured && potentialJump.fromIndex === this.pieceJourney[0]) {
          this.pieces[this.droppedId] = [];
          erasedPieces.push(this.droppedId);
          this.subtractPiecesInPiecesCount(this.isBluePlaying, 1);
          isPiecesHuffed = true;
          isPlayerPieceHuffed = true;
          continue;
        }

        erasedPieces.push(potentialJump.fromIndex);
        this.pieces[potentialJump.fromIndex] = [];
        this.subtractPiecesInPiecesCount(this.isBluePlaying, 1);
        isPiecesHuffed = true;
      }
    }

    return { isPiecesHuffed, erasedPieces, isPlayerPieceHuffed };
  }

  crownPieceIfItEnterTheKingsRow(index: number) {
    const thePiece: Piece = this.pieces[index][0];
    const { x, y } = this.indexToCoordinates(index);

    if (y === 1 && thePiece.getIsBlue()) {
      thePiece.setIsKing(true);
      thePiece.setImgSrc(this.BLUE_KING_PIECE_IMG_SRC);
      return index;
    }

    if (y === 8 && !thePiece.getIsBlue()) {
      thePiece.setIsKing(true);
      thePiece.setImgSrc(this.RED_KING_PIECE_IMG_SRC);
      return index;
    }

    return -1;
  }

  blockAllPieces() {
    for (let piece of this.pieces) {
      if (piece.length !== 0 && piece[0].getIsCanMove()) {
        piece[0].setIsCanMove(false);
      }
    }
  }

  cheackIsWasAVictory() {
    if (this.redPiecesCount === 0) {
      if (this.isBlueMyColor) {
        this.modalMessage = "Congratulations, you won the game";
        this.loginService.updateRating(this.opponentData.rating, this.movesCounter);
      } else {
        this.modalMessage = this.opponentData.userName + ", won the game";
      }
      this.modalButton.nativeElement.click();
      this.blockAllPieces();
      this.isGameEnded = true;
      return true;
    }
    if (this.bluePiecesCount === 0) {
      if (!this.isBlueMyColor) {
        this.modalMessage = "Congratulations, you won the game";
        this.loginService.updateRating(this.opponentData.rating, this.movesCounter);
      } else {
        this.modalMessage = this.opponentData.userName + ", won the game";
      }
      this.modalButton.nativeElement.click();
      this.blockAllPieces();
      this.isGameEnded = true;
      return true;
    }

    return false;
  }

}
