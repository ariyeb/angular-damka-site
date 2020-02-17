import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { LoginService } from '../services/login.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  userName: string;
  password: string;
  isLogin: boolean;
  error: string = "";
  errorSub: Subscription;

  constructor(private loginService: LoginService) { }

  ngOnInit() {
    this.isLogin = true;
    this.form = new FormGroup({
      'userName': new FormControl(null, Validators.required),
      'password': new FormControl(null, Validators.required)
    });
  }

  setIsLogin(isLogin: boolean) {
    this.isLogin = isLogin;
  }

  onSubmit() {
    this.userName = (this.form.get('userName').value + "").trim();
    this.password = (this.form.get('password').value + "").trim();
    console.log(this.userName, this.password);

    if (this.userName.length === 0 || this.password.length === 0) {
      this.error = "You didn't enter user name or password"
      return;
    }

    if (this.isLogin) {
      this.errorSub = this.loginService.errorSubject.subscribe((err) => {
        this.error = err;
        this.errorSub.unsubscribe();
      });
      this.loginService.login(this.userName, this.password);
    } else {
      this.errorSub = this.loginService.errorSubject.subscribe((err) => {
        this.error = err;
        this.errorSub.unsubscribe();
      });
      this.loginService.signup(this.userName, this.password);
    }
  }

}
