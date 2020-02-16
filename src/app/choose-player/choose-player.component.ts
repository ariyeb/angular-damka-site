import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { SocketioService } from '../services/socketio.service';
import { Player } from '../models/player.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-choose-player',
  templateUrl: './choose-player.component.html',
  styleUrls: ['./choose-player.component.css']
})
export class ChoosePlayerComponent implements OnInit, OnDestroy {
  players: Player[] = [];
  player: Player;
  opponent: Player;
  getPlayerSub: Subscription;
  getPlayersSub: Subscription;
  getOpponentSub: Subscription;
  @ViewChild('buttonLaunchModal', { static: false }) buttonLaunchModal: ElementRef;

  constructor(private socketioService: SocketioService) { }

  ngOnInit() {
    this.opponent = { id: "", userName: "", rating: 0, userId: "" };
    this.player = this.socketioService.getPlayer();
    this.socketioService.setupSocketConnection();
    if (!this.player) {
      this.getPlayerSub = this.socketioService.getPlayer_Subject.subscribe((player) => {
        this.player = player;
        this.getPlayerSub.unsubscribe;
      });
    }
    this.getPlayersSub = this.socketioService.getPlayersSubject.subscribe((players) => {
      this.players = players.filter((player) => player.userId !== this.player.userId);
    });
    this.getOpponentSub = this.socketioService.getOpponentSubject.subscribe((opponent) => {
      this.opponent = opponent;
      console.log("component opponet", this.opponent);
      this.buttonLaunchModal.nativeElement.click();
    });
    this.socketioService.emitPlayerToServer();
  }

  ngOnDestroy() {
    this.getPlayersSub.unsubscribe();
    this.getOpponentSub.unsubscribe();
    console.log('choose player on destroy')
  }


  onClickPlayer(opponent: Player) {
    this.socketioService.emitChooseAPlayer(opponent);
  }

  onClickButtonLetsPlay() {
    this.socketioService.emitAgreeToPlay(this.opponent);
    this.buttonLaunchModal.nativeElement.click();
  }

}
