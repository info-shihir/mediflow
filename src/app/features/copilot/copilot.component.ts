import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-copilot',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './copilot.component.html',
styleUrls: ['./copilot.component.scss'],
})
export class Copilot {
  readonly store = inject(PharmacyStore);
  readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  onSendMessage(text: string) {
    const q = text.trim();
    if (!q) return;
    this.store.sendCopilotMessage(q);
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  sendQuick(prompt: string) {
    this.onSendMessage(prompt);
  }

  private scrollToBottom() {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
