import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-returns',
  imports: [ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './returns.html',

  styleUrls: ['./returns.scss'],
})
export class Returns {
  readonly store = inject(PharmacyStore);
  private readonly fb = inject(FormBuilder);

  readonly showReturnModal = signal<boolean>(false);

  readonly returnForm = this.fb.group({
    sale: ['SL-1081', Validators.required],
    customer: ['Farhana Rahman', Validators.required],
    item: ['Seclo 20mg', Validators.required],
    amount: [60, [Validators.required, Validators.min(1)]],
    reason: ['Damaged pack', Validators.required],
    notes: ['Customer noticed damaged foil seal upon unpacking.'],
  });

  openReturnModal() {
    this.showReturnModal.set(true);
  }

  submitReturn() {
    if (this.returnForm.invalid) return;
    const val = this.returnForm.value;
    this.store.createReturn({
      sale: val.sale!,
      customer: val.customer!,
      item: val.item!,
      amount: Number(val.amount),
      reason: val.reason!,
      notes: val.notes || '',
    });
    this.showReturnModal.set(false);
  }
}
