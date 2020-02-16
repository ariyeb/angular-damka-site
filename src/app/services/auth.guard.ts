import { Injectable } from "@angular/core";
import { CanActivate, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { LoginService } from './login.service';


@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {

    constructor(private loginService: LoginService, private router: Router) { }

    canActivate(): boolean | UrlTree | Promise<boolean | UrlTree> | Observable<boolean | UrlTree> {
        const isApproved = this.loginService.isUserLogged();
        if (isApproved) {
            return true;
        }

        return this.router.createUrlTree(['']);
    }
}