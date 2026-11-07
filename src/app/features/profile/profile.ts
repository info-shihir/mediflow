import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {UserRole} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

type ProfileTab = 'details' | 'security' | 'permissions' | 'activity';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
})
export class Profile {
  readonly store = inject(PharmacyStore);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly activeTab = signal<ProfileTab>('details');
  readonly showPin = signal<boolean>(false);
  readonly newPinInput = signal<string>('');

  readonly profile = computed(() => this.store.currentProfile());

  readonly profileForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    licenseNumber: ['', Validators.required],
    branch: ['Dhanmondi (HQ)', Validators.required],
    shift: ['Executive Operations (08:00 - 18:00)', Validators.required],
    bio: [''],
  });

  constructor() {
    // Populate form with active profile data
    const p = this.profile();
    this.profileForm.patchValue({
      name: p.name,
      email: p.email,
      phone: p.phone,
      licenseNumber: p.licenseNumber,
      branch: p.branch,
      shift: p.shift,
      bio: p.bio || '',
    });
  }

  readonly staffAuditEntries = computed(() => {
    const pName = this.profile().name.toLowerCase();
    const pRole = this.store.roleConfig().label.toLowerCase();
    return this.store.auditLog().filter((log) => {
      return (
        log.user.toLowerCase().includes(pName) ||
        log.role.toLowerCase().includes(pRole)
      );
    });
  });

  saveProfile() {
    if (this.profileForm.invalid) return;
    const val = this.profileForm.value;
    this.store.updateUserProfile({
      name: val.name!,
      email: val.email!,
      phone: val.phone!,
      licenseNumber: val.licenseNumber!,
      branch: val.branch!,
      shift: val.shift!,
      bio: val.bio || '',
    });
    this.profileForm.markAsPristine();
  }

  cycleAvatarColor() {
    const colors = ['#D6F599', '#9DE8D7', '#FED7AA', '#BBF7D0', '#B4B8FB', '#FDE68A', '#FCD385'];
    const current = this.profile().avatarBg;
    const nextIdx = (colors.indexOf(current) + 1) % colors.length;
    this.store.updateUserProfile({avatarBg: colors[nextIdx]});
  }

  updatePin() {
    const pin = this.newPinInput().trim();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      this.store.showToast('Invalid PIN', 'Please enter a valid 4-digit numeric PIN.', 'warn');
      return;
    }
    this.store.updateUserProfile({pin});
    this.newPinInput.set('');
    this.store.showToast('Terminal PIN Updated', 'Your POS fast-login passcode has been set.', 'success');
  }

  toggle2FA() {
    const next = !this.profile().twoFactorEnabled;
    this.store.updateUserProfile({twoFactorEnabled: next});
  }

  onRoleSwitch(event: Event) {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.store.setRole(role);
    const p = this.store.userProfiles()[role];
    this.profileForm.reset({
      name: p.name,
      email: p.email,
      phone: p.phone,
      licenseNumber: p.licenseNumber,
      branch: p.branch,
      shift: p.shift,
      bio: p.bio || '',
    });
  }
}
