import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { LoginService } from './login.service';
import { Subject } from 'rxjs';
import { Player } from '../models/player.model';
import { Router } from '@angular/router';
import { Piece } from '../models/piece.model';
import { DropData } from '../models/dropData.model';
import { MoveDoneData } from '../models/moveDoneData.model';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class SocketioService {
    private socket;
    private user: User;
    private player: Player;
    private opponent: Player;
    getPlayersSubject: Subject<Player[]>;
    getPlayer_Subject: Subject<Player>;
    getOpponentSubject: Subject<Player>;
    getDropData_Subject: Subject<DropData>;
    getMoveDoneData_Subject: Subject<MoveDoneData>;
    opponentLeftSubject: Subject<null>;
    isBlue: Boolean;

    constructor(private loginService: LoginService, private router: Router) {
        this.user = null;
        this.player = null;
        this.getPlayersSubject = new Subject<Player[]>();
        this.getPlayer_Subject = new Subject<Player>();
        this.getOpponentSubject = new Subject<Player>();
        this.getDropData_Subject = new Subject<DropData>();
        this.opponentLeftSubject = new Subject<null>();
        this.getMoveDoneData_Subject = new Subject<MoveDoneData>();
    }

    setupSocketConnection() {
        if (!this.player) {
            this.user = this.loginService.getUser();
            console.log("socket user", this.user);
            this.socket = io(environment.SERVER_ENDPOINT);
            console.log('socketioSevice - new socket connection');
        }

        this.socket.on('playersList', ({ players }) => {
            console.log("socket players:", players);
            this.getPlayersSubject.next(players);
        });

        this.socket.on('choosedByPlayer', (opponent: Player) => {
            this.opponent = opponent;
            console.log("service opponent:", this.opponent);
            this.getOpponentSubject.next(this.opponent);
        });
    }

    disconnect() {
        console.log('disconnect:', this.player);
        this.socket.emit('disconnection', this.player);
        this.player = null;
        this.opponent = null;
        this.socket.off();
    }

    emitPlayerToServer() {
        if (!this.player) {
            this.socket.emit('enterTheSite', this.user, (player: Player) => {
                console.log("socket player", player);
                this.player = player;
                this.getPlayer_Subject.next(this.player);
            });
        } else {
            this.socket.emit('playerEnterChoosePlayers', this.player);
        }
    }

    emitChooseAPlayer(opponent: Player) {
        this.socket.emit('choosePlayer', opponent);
        this.socket.on('opponentAgreedToPlay', (isBlue) => {
            this.opponent = opponent;
            this.isBlue = isBlue;
            this.activateListeningGameDataEvents();
            this.router.navigate(['/main/game']);
            this.socket.off('opponentAgreedToPlay');
            this.socket.off('playersList');
            this.socket.off('choosedByPlayer');
        });
    }

    emitAgreeToPlay(opponent: Player) {
        this.opponent = opponent;
        this.socket.emit('agreeToPlay', this.opponent, (isBlue: Boolean) => {
            this.isBlue = isBlue;
            this.activateListeningGameDataEvents();
            this.router.navigate(['/main/game']);
            this.socket.off('playersList');
            this.socket.off('choosedByPlayer');
        });
    }

    emitDropData(dropData: DropData) {
        this.socket.emit('dropData', dropData);
    }

    emitMoveDone(moveDoneData: MoveDoneData) {
        this.socket.emit('moveDone', moveDoneData);
    }

    emitPlayerLeftTheGame() {
        this.socket.emit('playerLeftTheGame', this.opponent);
        this.socket.off('getDropData');
        this.socket.off('getMoveDone');
        this.opponent = null;
    }

    getIsBlue() {
        return this.isBlue;
    }

    getPlayer() {
        return this.player;
    }

    getOpponent() {
        return this.opponent;
    }

    private activateListeningGameDataEvents() {
        this.socket.on('getDropData', (dropData: DropData) => {
            this.getDropData_Subject.next(dropData);
        });
        this.socket.on('getMoveDone', (moveDoneData: MoveDoneData) => {
            this.getMoveDoneData_Subject.next(moveDoneData);
        });
        this.socket.on('opponentLeftTheGame', () => {
            this.opponentLeftSubject.next();
        });
    }



}