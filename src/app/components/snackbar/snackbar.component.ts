import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.component.html',
  styleUrls: ['./snackbar.component.css']
})
export class SnackbarComponent {
  constructor(public snackbar: SnackbarService) {}

  public cssClass = computed(() => {
    const base = 'snackbar';
    const type = this.snackbar.type();
    return `${base} ${base}--${type}`;
  });
}


