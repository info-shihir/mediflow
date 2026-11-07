import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {App} from './app';

describe('App Root Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app shell successfully', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize with sidebar closed by default', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.isSidebarOpen()).toBe(false);
  });

  it('should toggle sidebar visibility state on demand', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.toggleSidebar();
    expect(app.isSidebarOpen()).toBe(true);
    app.closeSidebar();
    expect(app.isSidebarOpen()).toBe(false);
  });

  it('should render user section in the sidebar with user details and logout', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const sidebar = compiled.querySelector('app-sidebar');
    expect(sidebar).toBeTruthy();

    const userName = sidebar?.textContent;
    expect(userName).toContain('Alex Smith');
    expect(userName).toContain('admin@mediflow.io');
    expect(sidebar?.querySelector('select')).toBeTruthy();
    expect(sidebar?.querySelector('a[href="/login"]')).toBeTruthy();

    // Verify user profile is no longer in topbar
    const topbar = compiled.querySelector('app-topbar');
    expect(topbar?.querySelector('select')).toBeFalsy();
  });
});
