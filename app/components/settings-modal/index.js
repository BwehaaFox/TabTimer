import Component from '@glimmer/component';
import { action } from '@ember/object';
import { cached, tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class SettingsModalComponent extends Component {
  @service storage;

  @tracked currentTime = null;

  constructor() {
    super(...arguments);
    // Устанавливаем начальное время при создании компонента, проверяя наличие tab
    this.currentTime = this.args.tab ? this.args.tab.time : 0;
    
    // Запускаем интервал для обновления времени
    this.startUpdatingTime();
  }

  willDestroy() {
    if (this.timeIntervalId) {
      clearInterval(this.timeIntervalId);
    }
    super.willDestroy(...arguments);
  }

  startUpdatingTime() {
    // Очищаем предыдущий интервал, если он существует
    if (this.timeIntervalId) {
      clearInterval(this.timeIntervalId);
    }

    // Запускаем интервал для обновления времени каждую секунду
    this.timeIntervalId = setInterval(() => {
      // Проверяем, что tab существует
      if (this.args.tab) {
        // Получаем актуальные таймеры из хранилища
        const savedTabs = this.storage.getItem('tabtimer-tabs');
        if (savedTabs) {
          const currentTab = savedTabs.find(tab => tab.id === this.args.tab.id);
          if (currentTab) {
            this.currentTime = currentTab.time;
          }
        }
      }
    }, 1000); // Обновляем каждую секунду
  }

  @action
  updateName(event) {
    const newName = event.target.value;
    this.args.onUpdateName(newName);
  }

  @action
  stopPropagation(event) {
    event.stopPropagation();
  }

  @action
  adjustTime(amount) {
    if (this.args.tab) {
      // Используем актуальное время для расчета
      const actualCurrentTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
      const newTime = Math.max(0, actualCurrentTime + amount);
      this.args.onUpdateTime(this.args.tab, newTime);

      // Обновляем локальное время после изменения
      this.currentTime = newTime;
    }
  }

  @action
  resetTime() {
    if (this.args.tab) {
      this.args.onUpdateTime(this.args.tab, 0);
      this.currentTime = 0;
    }
  }

  @cached
  get formattedTime() {
    // Используем актуальное время, если оно доступно
    const actualTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
    if (this.args.tab) {
      return this.formatTime(actualTime);
    }
    return '0:00';
  }

  get minusOneDisabled() {
    const actualTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
    return this.args.tab && actualTime < 1;
  }

  get minusMinuteDisabled() {
    const actualTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
    return this.args.tab && actualTime < 60;
  }

  get minusHourDisabled() {
    const actualTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
    return this.args.tab && actualTime < 3600;
  }

  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    } else {
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  }
}