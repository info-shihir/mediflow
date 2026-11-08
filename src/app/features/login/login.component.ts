import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {UserRole} from '../../core/models/pharmacy.models';
import {HttpClient} from '@angular/common/http';


export interface DemoAccount {
  role: UserRole;
  name: string;
  license: string;
  email: string;
  badge: string;
  icon: string;
  specialty: string;
}

@Component({

  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  styles: [
    `
      /* Floating 3D Vector Capsules */
      .capsule-wrap {
        position: absolute;
        will-change: transform;
        }

      .capsule-top-right {
        top: 14%;
        right: 12%;
        animation: floatSlow 7s ease-in-out infinite;
      }

      .capsule-bottom-left {
        bottom: 16%;
        left: 10%;
        animation: floatReverse 8.5s ease-in-out infinite;
      }

      .tablet-top-left {
        top: 22%;
        left: 16%;
        animation: floatSlow 6s ease-in-out 1s infinite;
      }

      .tablet-bottom-right {
        bottom: 24%;
        right: 18%;
        animation: floatReverse 7.5s ease-in-out 0.5s infinite;
      }

      /* Capsule Structure */
      .capsule-3d {
        position: relative;
        width: 44px;
        height: 108px;
        border-radius: 9999px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 16px 32px -6px rgba(10, 38, 35, 0.22),
          0 0 16px 2px rgba(45, 212, 191, 0.25),
          inset 0 1px 2px rgba(255, 255, 255, 0.7);
        transform: rotate(35deg);
        border: 1px solid rgba(255, 255, 255, 0.5);
      }

      .capsule-half {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .capsule-half-teal {
        background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);
      }

      .capsule-half-emerald {
        background: linear-gradient(135deg, #a7f3d0 0%, #34d399 100%);
      }

      .capsule-half-cyan {
        background: linear-gradient(135deg, #06b6d4 0%, #0e7490 100%);
      }

      .capsule-half-slate {
        background: linear-gradient(135deg, #0a2623 0%, #134e4a 100%);
      }

      .capsule-band {
        height: 3px;
        background: rgba(255, 255, 255, 0.4);
        width: 100%;
        z-index: 2;
      }

      .capsule-label {
        font-family: monospace;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.85);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        transform: rotate(-90deg);
      }

      .capsule-glare {
        position: absolute;
        top: 0;
        left: 5px;
        bottom: 0;
        width: 6px;
        background: linear-gradient(
          to right,
          rgba(255, 255, 255, 0.5),
          transparent
        );
        border-radius: 9999px;
        pointer-events: none;
      }

      /* Round Compressed Tablet / Pill */
      .tablet-3d {
        position: relative;
        width: 48px;
        height: 48px;
        border-radius: 9999px;
        background: linear-gradient(145deg, #ffffff 0%, #e2e8f0 100%);
        border: 2px solid rgba(255, 255, 255, 0.85);
        box-shadow: 0 12px 24px -4px rgba(10, 38, 35, 0.15),
          0 0 12px rgba(45, 212, 191, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(20deg);
      }

      .tablet-round-mini {
        width: 32px;
        height: 32px;
        background: linear-gradient(145deg, #99f6e4 0%, #2dd4bf 100%);
        transform: rotate(-40deg);
      }

      .tablet-score-line {
        position: absolute;
        width: 70%;
        height: 1.5px;
        background: rgba(100, 116, 139, 0.5);
        box-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
      }

      .tablet-stamp {
        position: absolute;
        bottom: 6px;
        font-family: monospace;
        font-size: 7px;
        font-weight: bold;
        color: rgba(71, 85, 105, 0.7);
      }

      /* Radar Rings for Green Cross */
      .radar-ring {
        position: absolute;
        border-radius: 9999px;
        border: 1.5px solid rgba(13, 148, 136, 0.35);
        animation: radarPing 3.5s cubic-bezier(0, 0.2, 0.8, 1) infinite;
      }

      .radar-ring-1 {
        width: 48px;
        height: 48px;
      }

      .radar-ring-2 {
        width: 76px;
        height: 76px;
        animation-delay: 1.75s;
      }

      /* ECG Line Keyframes */
      .ecg-line {
        stroke-dasharray: 2000;
        stroke-dashoffset: 2000;
        animation: ecgSweep 6s linear infinite;
        filter: drop-shadow(0 0 4px rgba(13, 148, 136, 0.45));
      }

      /* Molecular subtle rotation */
      .molecular-spin-subtle {
        animation: subtleDrift 20s ease-in-out infinite alternate;
      }

      /* Keyframe Definitions */
      @keyframes floatSlow {
        0%,
        100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-16px) rotate(5deg);
        }
      }

      @keyframes floatReverse {
        0%,
        100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(18px) rotate(-6deg);
        }
      }

      @keyframes radarPing {
        0% {
          transform: scale(0.6);
          opacity: 0.9;
        }
        100% {
          transform: scale(1.6);
          opacity: 0;
        }
      }

      @keyframes ecgSweep {
        0% {
          stroke-dashoffset: 2000;
        }
        50% {
          stroke-dashoffset: 0;
        }
        100% {
          stroke-dashoffset: -2000;
        }
      }

      @keyframes subtleDrift {
        0% {
          transform: rotate(0deg) scale(1);
        }
        100% {
          transform: rotate(8deg) scale(1.05);
        }
      }
    `,
  ],
})
export class Login {
  readonly store = inject(PharmacyStore);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly showPassword = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly selectedRole = signal<UserRole>('Admin');

  readonly demoAccounts: DemoAccount[] = [
    {
      role: 'Pharmacist',
      name: 'Samira Ahmed',
      license: 'RPh #84210',
      email: 'pharmacist@mediflow.io',
      badge: 'Staff RPh',
      icon: '💊',
      specialty: 'Rx Dispensing & Drug Interactions',
    },
    {
      role: 'Admin',
      name: 'Dr. Tariq Hasan',
      license: 'PharmD #10492',
      email: 'admin@mediflow.io',
      badge: 'Chief PharmD',
      icon: '🩺',
      specialty: 'Clinical Governance & Audit Logs',
    },
    {
      role: 'Cashier',
      name: 'Rafi Hasan',
      license: 'CPhT #39102',
      email: 'cashier@mediflow.io',
      badge: 'Dispensary POS',
      icon: '🧾',
      specialty: 'Patient Copay & OTC Checkout',
    },
    {
      role: 'Inventory',
      name: 'Nabila Karim',
      license: 'INV #77124',
      email: 'inventory@mediflow.io',
      badge: 'Cold-Chain Lead',
      icon: '🧪',
      specialty: 'Intake, Batch Expiry & Reorder',
    },
    {
      role: 'BranchManager',
      name: 'Farhan Chowdhury',
      license: 'MGR #50021',
      email: 'branch@mediflow.io',
      badge: 'Branch Mgr',
      icon: '🏥',
      specialty: 'Dispensary Transfers & Auditing',
    },
  ];

  readonly loginForm = new FormGroup({
    username: new FormControl('admin@mediflow.io', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
  });

  selectAccount(acc: DemoAccount) {
    this.selectedRole.set(acc.role);
    this.loginForm.patchValue({
      username: acc.email,
      password: 'mediflow2026',
    });
    this.errorMessage.set('');
  }

  togglePasswordVisibility() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please provide valid credentials.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const username = this.loginForm.controls.username.value.toLowerCase().trim();
    const password = this.loginForm.controls.password.value;

    // Obtain CSRF token cookie first
    this.http.get('/api/auth/csrf', { responseType: 'text' }).subscribe({
      next: () => {
        // Perform real login against backend
        this.http
          .post<any>('/api/auth/login', { username: username, password }, { withCredentials: true })
          .subscribe({
            next: (res) => {
              // Store JWT token from backend
              this.store.setToken(res.token);
              // this.store.loadInitialData(); // Removed – store loads data lazily after login
              this.store.showToast(
                'Welcome Back',
                `Signed in successfully as ${this.store.roleConfig().name}.`,
                'success',
              );
              this.router.navigate(['/dashboard']);
            },
            error: () => {
              this.errorMessage.set('Login failed: Invalid credentials');
              this.isSubmitting.set(false);
            },
            complete: () => {
              this.isSubmitting.set(false);
            },
          });
      },
      error: () => {
        this.errorMessage.set('Failed to obtain CSRF token');
        this.isSubmitting.set(false);
      },
    });
  }
}
