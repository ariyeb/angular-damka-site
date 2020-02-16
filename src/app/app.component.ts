import { Component, OnDestroy } from '@angular/core';
import { SocketioService } from './services/socketio.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  title = 'damka';

  constructor(private socketioService: SocketioService) {

  }

  ngOnDestroy() {
    // this.socketioService.disconnect();
  }
}
