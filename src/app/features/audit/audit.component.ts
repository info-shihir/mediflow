import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-audit',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audit.component.html',

  styleUrls: ['./audit.component.scss'],
})
export class Audit {
  readonly store = inject(PharmacyStore);

  readonly searchQuery = signal<string>('');
  readonly eventFilter = signal<string>('all');

  readonly filteredAuditLog = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const event = this.eventFilter();

    return this.store.auditLog().filter((a) => {
      const matchQ =
        a.user.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.event.toLowerCase().includes(q) ||
        a.entity.toLowerCase().includes(q) ||
        a.details.toLowerCase().includes(q);

      const matchEvent = event === 'all' || a.event === event;
      return matchQ && matchEvent;
    });
  });

  exportAuditCSV() {
    const headers = ['Timestamp', 'User', 'Role', 'Event', 'Entity', 'Details'];
    const rows = this.store.auditLog().map((a) => [
      `"${a.time}"`,
      `"${a.user}"`,
      `"${a.role}"`,
      a.event,
      `"${a.entity}"`,
      `"${a.details}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediflow-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.store.showToast('Audit Log Exported', 'Downloaded complete audit records.');
  }
}
