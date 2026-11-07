import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs/operators';
import {Sidebar} from './layout/sidebar.component';
import {Topbar} from './layout/topbar.component';
import {PharmacyStore} from './core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, Topbar, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly store = inject(PharmacyStore);
  private readonly router = inject(Router);
  readonly isSidebarOpen = signal<boolean>(false);
  readonly isLoginPage = signal<boolean>(false);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url.split('?')[0];
        this.isLoginPage.set(url === '/login');
      });
  }

  ngOnInit() {
    this.store.loadInitialData();
    const url = this.router.url.split('?')[0];
    this.isLoginPage.set(url === '/login');
  }

  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }
}

