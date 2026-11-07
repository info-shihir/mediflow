import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-settings',
  imports: [ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',

  styleUrls: ['./settings.scss'],
})
export class Settings {
  readonly store = inject(PharmacyStore);
  private readonly fb = inject(FormBuilder);

  readonly settingsForm = this.fb.group({
    name: [this.store.settings().name, Validators.required],
    phone: [this.store.settings().phone],
    address: [this.store.settings().address],
    currency: [this.store.settings().currency],
    lowStockAlerts: [this.store.settings().lowStockAlerts],
    expiryAlerts: [this.store.settings().expiryAlerts],
    rxVerificationRequired: [this.store.settings().rxVerificationRequired],
  });

  toggle(field: 'lowStockAlerts' | 'expiryAlerts' | 'rxVerificationRequired') {
    const cur = this.settingsForm.get(field)?.value;
    this.settingsForm.patchValue({[field]: !cur});
  }

  save() {
    if (this.settingsForm.invalid) return;
    const val = this.settingsForm.value;
    this.store.saveSettings({
      name: val.name!,
      phone: val.phone || '',
      address: val.address || '',
      currency: val.currency || 'BDT (৳)',
      lowStockAlerts: Boolean(val.lowStockAlerts),
      expiryAlerts: Boolean(val.expiryAlerts),
      rxVerificationRequired: Boolean(val.rxVerificationRequired),
    });
  }
}
