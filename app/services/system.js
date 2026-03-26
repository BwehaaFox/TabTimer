import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class SysyemService extends Service {
  @tracked isTransparentMode;
  constructor(...args) {
    super(...args);
    window.electronAPI.onChangeTransparentMode((state) => {
      this.isTransparentMode = state;
    });
  }
}
