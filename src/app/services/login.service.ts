import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class LoginService {
    private user: User;
    userSubject: Subject<User>;
    errorSubject: Subject<string>;
    private HTTP_OPTIONS;
    private token: string;

    constructor(private http: HttpClient, private router: Router) {
        this.token = null;
        this.errorSubject = new Subject<string>();
        this.userSubject = new Subject<User>();
        this.HTTP_OPTIONS = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        };
    }

    signup(userName: string, password: string) {
        this.http.post(
            environment.SERVER_ENDPOINT + '/users',
            { userName, password },
            this.HTTP_OPTIONS).subscribe((res) => {
                this.handleResultOfLoginOrSignup(res);
            }, (err) => {
                if (err.status = 400) {
                    this.errorSubject.next('User Name already exist');
                };
            });
    }

    login(userName: string, password: string) {
        this.http.post(
            environment.SERVER_ENDPOINT + '/users/login',
            { userName, password },
            this.HTTP_OPTIONS
        ).subscribe((res) => {
            this.handleResultOfLoginOrSignup(res);
        }, (err) => {
            if (err.status = 400) {
                this.errorSubject.next('User name or Password are incorecct');
            };
        });
    }

    logout() {
        const url = environment.SERVER_ENDPOINT + "/users/logout";
        const header = {
            headers: new HttpHeaders({
                'Authorization': 'Bearer ' + this.token
            })
        };
        this.http.post(url, null, header).subscribe((res) => {
            console.log(res);
            this.router.navigate(['']);
            this.token = null;
            this.user = null;
        }, (err) => {
            console.log("url:", url);
            console.log("token: ", this.token);
            console.log(err);
            this.router.navigate(['']);
            this.token = null;
            this.user = null;
        });
    }

    private handleResultOfLoginOrSignup(res) {
        this.token = res.token;
        this.user = { userName: res.user.userName, rating: res.user.rating, id: res.user._id };
        console.log("user", this.user);
        this.userSubject.next(this.user);
        this.router.navigate(['/main/choose-player']);
    }

    getUser(): User {
        return { userName: this.user.userName, rating: this.user.rating, id: this.user.id };
    }

    isUserLogged() {
        return this.token !== null;
    }
}