import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { MainNavigationComponent } from './main-navigation/main-navigation.component';
import { GameComponent } from './game/game.component';
import { LoginComponent } from './login/login.component';
import { ChoosePlayerComponent } from './choose-player/choose-player.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { AuthGuard } from './services/auth.guard';

const appRoutes: Routes = [
  { path: '', component: LoginComponent },
  {
    path: 'main', component: MainNavigationComponent, canActivate: [AuthGuard], children: [
      { path: 'choose-player', component: ChoosePlayerComponent },
      { path: 'game', component: GameComponent }
    ]
  }
]

@NgModule({
  declarations: [
    AppComponent,
    MainNavigationComponent,
    GameComponent,
    LoginComponent,
    ChoosePlayerComponent,
    SpinnerComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    RouterModule, [RouterModule.forRoot(appRoutes)],
    ReactiveFormsModule,
    FormsModule,
    DragDropModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
