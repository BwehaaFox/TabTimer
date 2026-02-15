import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class TabTimerComponent extends Component {
  @tracked showAddDropdown = false;
  dropdownTimeoutId = null;

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

  getRandomBackgroundColor() {
    // Генерируем случайный цвет, который будет хорошо контрастировать с белым текстом
    // Используем темные оттенки для лучшей контрастности с белым текстом
    const colors = [
      'rgba(30, 30, 30, 0.4)', // Темно-серый
      'rgba(25, 25, 112, 0.4)', // Темно-синий
      'rgba(139, 0, 0, 0.4)', // Темно-красный
      'rgba(0, 100, 0, 0.4)', // Темно-зеленый
      'rgba(139, 69, 19, 0.4)', // Коричневый
      'rgba(75, 0, 130, 0.4)', // Индиго
      'rgba(128, 0, 128, 0.4)', // Фиолетовый
      'rgba(0, 0, 139, 0.4)', // Темно-синий
    ];

    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  @action
  toggleAddDropdown() {
    this.showAddDropdown = !this.showAddDropdown;
    
    if (this.showAddDropdown) {
      // Если выпадающий список открыт, запускаем таймер автозакрытия
      this.startDropdownAutoClose();
    } else {
      // Если выпадающий список закрыт, отменяем таймер
      if (this.dropdownTimeoutId) {
        clearTimeout(this.dropdownTimeoutId);
        this.dropdownTimeoutId = null;
      }
    }
  }

  @action
  addNewTab(type) {
    this.args.onAddTab(type);
    this.showAddDropdown = false; // Скрываем выпадающий список после добавления
    // Очищаем таймер, если он был установлен
    if (this.dropdownTimeoutId) {
      clearTimeout(this.dropdownTimeoutId);
      this.dropdownTimeoutId = null;
    }
  }

  @action
  startDropdownAutoClose() {
    // Очищаем предыдущий таймер, если он был
    if (this.dropdownTimeoutId) {
      clearTimeout(this.dropdownTimeoutId);
    }
    
    // Устанавливаем таймер на 3 секунды для автозакрытия
    this.dropdownTimeoutId = setTimeout(() => {
      this.showAddDropdown = false;
    }, 3000);
  }

  @action
  cancelDropdownAutoClose() {
    // Отменяем таймер автозакрытия при наведении на выпадающий список
    if (this.dropdownTimeoutId) {
      clearTimeout(this.dropdownTimeoutId);
      this.dropdownTimeoutId = null;
    }
  }

  @action
  handleDragStart(index, event) {
    event.dataTransfer.setData('text/plain', index);
    event.dataTransfer.effectAllowed = 'move';
    // Добавляем визуальный эффект для элемента, который перетаскивается
    event.target.classList.add('dragging');
  }

  @action
  handleDragOver(index, event) {
    event.preventDefault(); // Необходимо для разрешения drop
    event.dataTransfer.dropEffect = 'move';
  }

  @action
  handleDragEnter(index, event) {
    event.preventDefault();
    // Добавляем класс для визуального индикатора места, куда можно сбросить
    event.target.classList.add('drag-over');
  }

  @action
  handleDragLeave(index, event) {
    // Удаляем класс при выходе из элемента
    event.target.classList.remove('drag-over');
  }

  @action
  handleDrop(index, event) {
    event.preventDefault();

    // Удаляем визуальные эффекты
    event.target.classList.remove('drag-over');
    const elements = document.querySelectorAll('.tab-item');
    elements.forEach(el => el.classList.remove('dragging'));

    const draggedIndex = parseInt(event.dataTransfer.getData('text/plain'));

    // Вызываем внешнее действие для обновления порядка
    if (typeof this.args.onReorderTabs === 'function') {
      this.args.onReorderTabs(draggedIndex, index);
    }
  }

  willDestroy() {
    // Очищаем таймер при уничтожении компонента
    if (this.dropdownTimeoutId) {
      clearTimeout(this.dropdownTimeoutId);
      this.dropdownTimeoutId = null;
    }
    super.willDestroy(...arguments);
  }
}
