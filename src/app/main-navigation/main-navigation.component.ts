import { Component, OnInit } from '@angular/core';
import { LoginService } from '../services/login.service';
import { SocketioService } from '../services/socketio.service';

@Component({
  selector: 'app-main-navigation',
  templateUrl: './main-navigation.component.html',
  styleUrls: ['./main-navigation.component.css']
})
export class MainNavigationComponent implements OnInit {

  constructor(private socketioSevice: SocketioService, private loginService: LoginService) { }

  ngOnInit() {
  }

  onLogout() {
    this.socketioSevice.disconnect();
    this.loginService.logout();
  }

}
