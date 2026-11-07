import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {Login} from './login.component';
import {PharmacyStore} from '../../core/state/pharmacy-store';

describe('Login Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        PharmacyStore,
      ],
    }).compileComponents();
  });

  it('should create the login component', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have initial admin credentials prefilled', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    expect(component.loginForm.controls.email.value).toBe('admin@mediflow.io');
    expect(component.loginForm.controls.branch.value).toBe('Downtown Flagship');
  });

  it('should toggle password visibility', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
  });

  it('should toggle password input field type when clicking the eye icon button', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const inputEl = fixture.nativeElement.querySelector('#password-input') as HTMLInputElement;
    const toggleBtn = fixture.nativeElement.querySelector('#toggle-password-btn') as HTMLButtonElement;

    expect(inputEl).toBeTruthy();
    expect(toggleBtn).toBeTruthy();
    expect(inputEl.type).toBe('password');

    // Click the eye icon
    toggleBtn.click();
    fixture.detectChanges();
    expect(inputEl.type).toBe('text');

    // Click again to hide
    toggleBtn.click();
    fixture.detectChanges();
    expect(inputEl.type).toBe('password');
  });

  it('should autofill credentials when selecting a demo account', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const pharmacist = component.demoAccounts.find((a) => a.role === 'Pharmacist');
    expect(pharmacist).toBeDefined();
    if (pharmacist) {
      component.selectAccount(pharmacist);
      expect(component.selectedRole()).toBe('Pharmacist');
      expect(component.loginForm.controls.email.value).toBe('pharmacist@mediflow.io');
    }
  });
});
