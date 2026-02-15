import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ConfirmDeleteModalComponent extends Component {
  @action
  confirmDelete() {
    if (this.args.onConfirm) {
      this.args.onConfirm();
    }
  }

  @action
  cancelDelete() {
    if (this.args.onCancel) {
      this.args.onCancel();
    }
  }

  @action
  stopPropagation(event) {
    event.stopPropagation();
  }
}