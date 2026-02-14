import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class SettingsModalComponent extends Component {
  @action
  updateName(event) {
    const newName = event.target.value;
    this.args.onUpdateName(newName);
  }
  
  @action
  stopPropagation(event) {
    event.stopPropagation();
  }
}