import Component from '@glimmer/component';
import { action } from '@ember/object';
import { cached, tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class SettingsModalComponent extends Component {
  @service storage;

  @tracked currentTime = null;
  @tracked selectedColor = null;
  @tracked targetDateTime = null;
  @tracked cycleHours = null;
  @tracked cycleMinutes = null;
  @tracked cycleSeconds = null;

  constructor() {
    super(...arguments);
    // Устанавливаем начальное время при создании компонента, проверяя наличие tab
    this.currentTime = this.args.tab ? this.args.tab.time : 0;

    // Устанавливаем начальный цвет фона, извлекая его из rgba в hex формат
    if (this.args.tab && this.args.tab.backgroundColor) {
      this.selectedColor = this.rgbaToHex(this.args.tab.backgroundColor);
    }

    // Устанавливаем начальное значение целевой даты и времени для countdown
    if (this.args.tab && this.args.tab.type === 'countdown' && this.args.tab.targetDateTime) {
      this.targetDateTime = this.args.tab.targetDateTime;
    }

    // Устанавливаем начальные значения длительности цикла для cyclic-timer
    if (this.args.tab && this.args.tab.type === 'cyclic-timer') {
      const cycleDuration = this.args.tab.cycleDuration || 3600; // по умолчанию 1 час
      this.setCycleTimeValues(cycleDuration);
    }

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
      let defaultTime = 0;
      if (this.args.tab.type === 'timer') {
        // Для таймера устанавливаем 10 минут по умолчанию при сбросе
        defaultTime = 600;
      }
      this.args.onUpdateTime(this.args.tab, defaultTime);
      this.currentTime = defaultTime;
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

  @cached
  get formattedTargetDateTime() {
    if (this.args.tab && this.args.tab.type === 'countdown' && this.args.tab.targetDateTime) {
      // Преобразуем ISO строку в формат, подходящий для datetime-local input
      // Убираем миллисекунды и Z из строки
      const date = new Date(this.args.tab.targetDateTime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return '';
  }

  get minusOneDisabled() {
    const actualTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
    // Для таймера кнопка "минус секунда" не должна быть отключена, так как можно уменьшать время
    if (this.args.tab && this.args.tab.type === 'timer') {
      return false;
    }
    return this.args.tab && actualTime < 1;
  }

  get minusMinuteDisabled() {
    const actualTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
    // Для таймера кнопка "минус минута" не должна быть отключена, так как можно уменьшать время
    if (this.args.tab && this.args.tab.type === 'timer') {
      return false;
    }
    return this.args.tab && actualTime < 60;
  }

  get minusHourDisabled() {
    const actualTime = this.currentTime !== null ? this.currentTime : (this.args.tab ? this.args.tab.time : 0);
    // Для таймера кнопка "минус час" не должна быть отключена, так как можно уменьшать время
    if (this.args.tab && this.args.tab.type === 'timer') {
      return false;
    }
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

  rgbaToHex(rgba) {
    // Извлекаем значения r, g, b из строки rgba(r, g, b, a)
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) return '#ffffff'; // возвращаем белый цвет по умолчанию
    
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
  }

  hexToRgba(hex, alpha = 0.4) {
    // Убираем # если он есть
    const cleanHex = hex.replace('#', '');
    
    // Разбиваем на компоненты
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  @action
  updateBackgroundColor(event) {
    const newHexColor = event.target.value;
    this.selectedColor = newHexColor;

    // Преобразуем hex в rgba с прозрачностью 0.4
    const newRgbaColor = this.hexToRgba(newHexColor, 0.4);

    // Вызываем внешний обработчик для обновления цвета фона таймера
    if (this.args.onUpdateBackgroundColor) {
      this.args.onUpdateBackgroundColor(this.args.tab, newRgbaColor);
    }
  }

  @action
  updateTargetDateTime(event) {
    console.log('updateTargetDateTime called', event.target.value);
    const newDateTime = event.target.value;
    console.log('Args received:', this.args);
    console.log('onUpdateTargetDateTime function exists:', typeof this.args.onUpdateTargetDateTime);

    if (newDateTime && this.args.tab && this.args.tab.type === 'countdown') {
      // Преобразуем выбранное значение в ISO строку
      const selectedDate = new Date(newDateTime);
      const isoString = selectedDate.toISOString();

      console.log('Updating target date time:', isoString);

      // Обновляем значение в состоянии компонента
      this.targetDateTime = isoString;

      // Рассчитываем новое время для отображения
      const now = new Date();
      const timeDifference = Math.max(0, Math.floor((selectedDate.getTime() - now.getTime()) / 1000));

      // Обновляем локальное время для отображения
      this.currentTime = timeDifference;

      // Обновляем целевую дату и время (это также обновит время таймера)
      if (this.args.onUpdateTargetDateTime && typeof this.args.onUpdateTargetDateTime === 'function') {
        console.log('Calling onUpdateTargetDateTime');
        this.args.onUpdateTargetDateTime(this.args.tab, isoString);
      } else {
        console.error('onUpdateTargetDateTime is not a function');
      }
    }
  }

  @action
  updateCycleDuration(event) {
    // Обновляем внутренние значения в зависимости от того, какое поле было изменено
    if (event.target.id === 'cycle-duration-hours') {
      this.cycleHours = event.target.value;
    } else if (event.target.id === 'cycle-duration-minutes') {
      this.cycleMinutes = event.target.value;
    } else if (event.target.id === 'cycle-duration-seconds') {
      this.cycleSeconds = event.target.value;
    }
    
    if (this.args.tab && this.args.tab.type === 'cyclic-timer') {
      // Получаем значения из всех полей
      const hours = parseInt(this.cycleHours) || 0;
      const minutes = parseInt(this.cycleMinutes) || 0;
      const seconds = parseInt(this.cycleSeconds) || 0;

      // Рассчитываем общее время в секундах
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      // Обновляем длительность цикла
      if (this.args.onUpdateCycleDuration && typeof this.args.onUpdateCycleDuration === 'function') {
        this.args.onUpdateCycleDuration(this.args.tab, totalSeconds);
      }
    }
  }

  setCycleTimeValues(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.cycleHours = hours;
    this.cycleMinutes = minutes;
    this.cycleSeconds = seconds;
  }

  @cached
  get formattedCycleTime() {
    if (this.args.tab && this.args.tab.type === 'cyclic-timer') {
      const cycleDuration = this.args.tab.cycleDuration || 3600; // по умолчанию 1 час
      return this.formatTime(cycleDuration);
    }
    return '0:00';
  }
}