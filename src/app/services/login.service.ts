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
    ratingUpdateSubject: Subject<number>;
    userSubject: Subject<User>;
    errorSubject: Subject<string>;
    private HTTP_OPTIONS;
    private token: string;

    constructor(private http: HttpClient, private router: Router) {
        this.token = null;
        this.errorSubject = new Subject<string>();
        this.userSubject = new Subject<User>();
        this.ratingUpdateSubject = new Subject<number>();
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

    updateRating(looserRating: number, movesCount: number) {
        const winnerRating = this.user.rating;
        console.log('currentRating:', winnerRating);
        let newRating: number = winnerRating + 30 + Math.ceil(500 / movesCount);

        if (looserRating <= winnerRating) {
            newRating += Math.ceil(looserRating / winnerRating * 50);
        } else {
            newRating += 100 - Math.ceil(winnerRating / looserRating * 50);
        }

        const url = environment.SERVER_ENDPOINT + '/users/me';
        const headers = {
            headers: new HttpHeaders({
                'Authorization': 'Bearer ' + this.token,
                'Content-Type': 'application/json'
            })
        };

        this.http.patch(url, { rating: newRating }, headers).subscribe((res: { rating: number }) => {
            console.log('userUpdatedRating:', res.rating);
            this.user.rating = res.rating;
            this.ratingUpdateSubject.next(res.rating);
        }, (err) => {
            console.log(err)
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
                this.errorSubject.next('User name or Password are incorecct. If you are not registered, please sign up.');
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
            this.router.navigate(['']);
            this.token = null;
            this.user = null;
        }, (err) => {
            console.log(err);
            this.router.navigate(['']);
            this.token = null;
            this.user = null;
        });
    }

    private handleResultOfLoginOrSignup(res) {
        this.token = res.token;
        this.user = { userName: res.user.userName, rating: res.user.rating, id: res.user._id };
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