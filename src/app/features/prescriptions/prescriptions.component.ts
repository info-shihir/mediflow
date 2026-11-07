import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {PrescriptionItem} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-prescriptions',
  imports: [ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prescriptions.html',
})
export class Prescriptions {
  readonly store = inject(PharmacyStore);
  private readonly fb = inject(FormBuilder);

  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('all');

  readonly showReviewModal = signal<boolean>(false);
  readonly showAddModal = signal<boolean>(false);
  readonly selectedRx = signal<PrescriptionItem | null>(null);

  readonly checkIdentity = signal<boolean>(false);
  readonly checkLegibility = signal<boolean>(false);
  readonly checkAllergy = signal<boolean>(false);
  readonly checkAppropriateness = signal<boolean>(false);

  readonly addRxForm = this.fb.group({
    patient: ['', Validators.required],
    doctor: ['', Validators.required],
    date: ['2026-10-12', Validators.required],
    items: [2, [Validators.required, Validators.min(1)]],
    medicines: ['', Validators.required],
  });

  readonly filteredPrescriptions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const status = this.statusFilter();

    return this.store.prescriptions().filter((p) => {
      const matchQ =
        p.id.toLowerCase().includes(q) ||
        p.patient.toLowerCase().includes(q) ||
        p.doctor.toLowerCase().includes(q) ||
        p.medicines.toLowerCase().includes(q);
      const matchStatus = status === 'all' || p.status === status;
      return matchQ && matchStatus;
    });
  });

  openReviewModal(rx: PrescriptionItem) {
    this.selectedRx.set(rx);
    this.checkIdentity.set(rx.checks.identity);
    this.checkLegibility.set(rx.checks.legibility);
    this.checkAllergy.set(rx.checks.allergy);
    this.checkAppropriateness.set(rx.checks.appropriateness);
    this.showReviewModal.set(true);
  }

  saveReview(id: string, notes: string, outcome: string) {
    const checks = {
      identity: this.checkIdentity(),
      legibility: this.checkLegibility(),
      allergy: this.checkAllergy(),
      appropriateness: this.checkAppropriateness(),
    };

    const allChecked = Object.values(checks).every(Boolean);
    if (outcome === 'Reviewed' && !allChecked) {
      this.store.showToast(
        'Review incomplete',
        'All 4 verification checks must be confirmed before marking Reviewed.',
        'warn',
      );
      return;
    }

    this.store.reviewPrescription(id, checks, notes, outcome);
    this.showReviewModal.set(false);
  }

  openAddModal() {
    this.addRxForm.reset({
      patient: '',
      doctor: '',
      date: new Date().toISOString().slice(0, 10),
      items: 2,
      medicines: '',
    });
    this.showAddModal.set(true);
  }

  submitAddRx() {
    if (this.addRxForm.invalid) return;
    const val = this.addRxForm.value;
    this.store.addPrescription({
      patient: val.patient!,
      doctor: val.doctor!,
      date: val.date!,
      items: Number(val.items),
      medicines: val.medicines!,
    });
    this.showAddModal.set(false);
  }

  readonly currentFefoPlan = computed(() => {
    const rx = this.selectedRx();
    if (!rx) return null;
    return this.store.suggestFefoBatchesForPrescription(rx);
  });

  fulfillWithFefo(id: string) {
    const success = this.store.fulfillPrescriptionWithFefo(id);
    if (success) {
      this.showReviewModal.set(false);
    }
  }
}
