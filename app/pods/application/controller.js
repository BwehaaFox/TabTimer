import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ApplicationController extends Controller {
  @service storage;

  @tracked tabs = [];
  @tracked activeSettingsTab = null;
  @tracked showSettingsModal = false;
  @tracked showConfirmDeleteModal = false;
  @tracked tabToDelete = null;

  timerIntervalId = null;

  constructor() {
    super(...arguments);

    if (!window.electronAPI?.setIgnoreMouse) {
      window.electronAPI = {
        setIgnoreMouse: () => {},
      };
    }

    window.electronAPI.setIgnoreMouse(true, { forward: true });
    this.loadTabs();
    this.startTimerLoop();
  }

  loadTabs() {
    const savedTabs = this.storage.getItem('tabtimer-tabs');
    if (savedTabs) {
      this.tabs = savedTabs.map((tab) => {
        // Проверяем, нужно ли обновить прозрачность у существующего цвета
        let backgroundColor = tab.backgroundColor;

        // Если цвет существует, но не содержит правильную прозрачность (0.4),
        // преобразуем его в нужный формат
        if (backgroundColor && !this.hasProperTransparency(backgroundColor)) {
          backgroundColor = this.convertToProperTransparency(backgroundColor);
        }

        return {
          ...tab,
          type: tab.type || 'stopwatch', // Добавляем тип таймера, по умолчанию секундомер
          isRunning:
            typeof tab.isRunning !== 'undefined' ? tab.isRunning : false,
          time: tab.time || 0,
          targetDateTime: tab.targetDateTime || null, // Добавляем целевую дату и время для countdown
          backgroundColor: backgroundColor || this.getRandomBackgroundColor(),
        };
      });
    } else {
      this.tabs = [];
    }
  }

  @action
  addTab(type = 'stopwatch') {
    let initialTime = 0;
    let isRunning = false;
    
    if (type === 'timer') {
      initialTime = 600; // Для таймера устанавливаем 10 минут по умолчанию
      isRunning = false;
    } else if (type === 'countdown') {
      // Для countdown устанавливаем дату на 1 день вперед по умолчанию
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      initialTime = Math.floor((futureDate.getTime() - Date.now()) / 1000); // Разница в секундах
      isRunning = true; // Countdown всегда запущен
    } else {
      // Для stopwatch
      initialTime = 0;
      isRunning = false;
    }
    
    const newTab = {
      id: Date.now(),
      name: '',
      time: initialTime,
      isRunning: isRunning,
      type: type,
      targetDateTime: type === 'countdown' ? new Date(Date.now() + 86400000).toISOString() : null, // Устанавливаем дату на 1 день вперед по умолчанию для countdown
      backgroundColor: this.getRandomBackgroundColor(),
    };
    this.tabs = [...this.tabs, newTab];
    this.saveTabs();
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
  toggleTimer(tab) {
    const tabIndex = this.tabs.findIndex((t) => t.id === tab.id);
    if (tabIndex !== -1) {
      const updatedTab = {
        ...tab,
        isRunning: !tab.isRunning,
        backgroundColor: tab.backgroundColor,
      };
      const updatedTabs = [
        ...this.tabs.slice(0, tabIndex),
        updatedTab,
        ...this.tabs.slice(tabIndex + 1),
      ];
      this.tabs = updatedTabs;
      this.saveTabs();
    }
  }

  @action
  openSettings(tab) {
    this.activeSettingsTab = tab;
    this.showSettingsModal = true;
  }

  @action
  closeSettings() {
    this.showSettingsModal = false;
    this.activeSettingsTab = null;
  }

  @action
  openConfirmDeleteModal(tab) {
    this.tabToDelete = tab;
    this.showConfirmDeleteModal = true;
  }

  @action
  closeConfirmDeleteModal() {
    this.showConfirmDeleteModal = false;
    this.tabToDelete = null;
  }

  hasProperTransparency(rgbaString) {
    // Проверяем, заканчивается ли строка на ', 0.4)' или ',0.4)'
    const trimmed = rgbaString.trim();
    return trimmed.endsWith(', 0.4)') || trimmed.endsWith(',0.4)');
  }

  convertToProperTransparency(rgbaString) {
    // Извлекаем значения r, g, b из строки rgba(r, g, b, a)
    const match = rgbaString.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/,
    );
    if (!match) {
      // Если строка не соответствует формату rgba, возвращаем случайный цвет
      return this.getRandomBackgroundColor();
    }

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);

    return `rgba(${r}, ${g}, ${b}, 0.4)`;
  }

  @action
  confirmDeleteTab() {
    if (this.tabToDelete) {
      this.deleteTab(this.tabToDelete);
      this.closeConfirmDeleteModal();
    }
  }

  @action
  updateTabName(name) {
    if (this.activeSettingsTab) {
      const tabIndex = this.tabs.findIndex(
        (t) => t.id === this.activeSettingsTab.id,
      );
      if (tabIndex !== -1) {
        const updatedTab = {
          ...this.activeSettingsTab,
          name: name,
          backgroundColor: this.activeSettingsTab.backgroundColor,
        };
        const updatedTabs = [
          ...this.tabs.slice(0, tabIndex),
          updatedTab,
          ...this.tabs.slice(tabIndex + 1),
        ];
        this.tabs = updatedTabs;
        this.activeSettingsTab = updatedTab;
        this.saveTabs();
      }
    }
  }

  @action
  updateTabTime(tab, newTime) {
    const tabIndex = this.tabs.findIndex((t) => t.id === tab.id);
    if (tabIndex !== -1) {
      const updatedTab = {
        ...tab,
        time: newTime,
        backgroundColor: tab.backgroundColor,
      };
      const updatedTabs = [
        ...this.tabs.slice(0, tabIndex),
        updatedTab,
        ...this.tabs.slice(tabIndex + 1),
      ];
      this.tabs = updatedTabs;
      this.activeSettingsTab = updatedTab;
      this.saveTabs();
    }
  }

  @action
  updateTabTargetDateTime(tab, targetDateTime) {
    console.log('updateTabTargetDateTime called', tab.id, targetDateTime);
    const tabIndex = this.tabs.findIndex((t) => t.id === tab.id);
    if (tabIndex !== -1) {
      // Рассчитываем новое время на основе новой целевой даты
      const targetDate = new Date(targetDateTime);
      const now = new Date();
      const newTime = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
      
      console.log('Calculated new time:', newTime);
      
      // Для countdown таймера устанавливаем isRunning в true, если время не истекло
      const isRunning = newTime > 0;
      
      const updatedTab = {
        ...tab,
        targetDateTime: targetDateTime,
        time: newTime,
        isRunning: isRunning,
        backgroundColor: tab.backgroundColor,
      };
      const updatedTabs = [
        ...this.tabs.slice(0, tabIndex),
        updatedTab,
        ...this.tabs.slice(tabIndex + 1),
      ];
      this.tabs = updatedTabs;
      
      // Обновляем activeSettingsTab, если он соответствует изменяемому табу
      if (this.activeSettingsTab && this.activeSettingsTab.id === tab.id) {
        this.activeSettingsTab = updatedTab;
      }
      
      this.saveTabs();
      console.log('Updated tabs and saved');
    }
  }

  @action
  updateTabBackgroundColor(tab, backgroundColor) {
    const tabIndex = this.tabs.findIndex((t) => t.id === tab.id);
    if (tabIndex !== -1) {
      const updatedTab = {
        ...tab,
        backgroundColor: backgroundColor,
      };
      const updatedTabs = [
        ...this.tabs.slice(0, tabIndex),
        updatedTab,
        ...this.tabs.slice(tabIndex + 1),
      ];
      this.tabs = updatedTabs;
      this.activeSettingsTab = updatedTab;
      this.saveTabs();
    }
  }

  @action
  deleteTab(tabToDelete) {
    if (tabToDelete) {
      this.tabs = this.tabs.filter((tab) => tab.id !== tabToDelete.id);
      if (
        this.activeSettingsTab &&
        this.activeSettingsTab.id === tabToDelete.id
      ) {
        this.closeSettings();
      }
      this.saveTabs();
    }
  }

  @action
  reorderTabs(fromIndex, toIndex) {
    if (fromIndex === toIndex) {
      return; // Если индексы совпадают, ничего не делаем
    }

    const updatedTabs = [...this.tabs]; // Создаем копию массива
    const [movedTab] = updatedTabs.splice(fromIndex, 1); // Удаляем элемент из старой позиции
    updatedTabs.splice(toIndex, 0, movedTab); // Вставляем в новую позицию

    this.tabs = updatedTabs; // Обновляем tracked свойство
    this.saveTabs(); // Сохраняем изменения
  }

  @action
  handleDragStart(index, event) {
    // Вызов метода из компонента
    return this.handleDragStartFromComponent(index, event);
  }

  @action
  handleDragOver(index, event) {
    // Вызов метода из компонента
    return this.handleDragOverFromComponent(index, event);
  }

  @action
  handleDragEnter(index, event) {
    // Вызов метода из компонента
    return this.handleDragEnterFromComponent(index, event);
  }

  @action
  handleDrop(index, event) {
    // Вызов метода из компонента
    return this.handleDropFromComponent(index, event);
  }

  // Внутренние методы для обработки событий перетаскивания
  handleDragStartFromComponent(index, event) {
    event.dataTransfer.setData('text/plain', index);
    event.dataTransfer.effectAllowed = 'move';
    // Добавляем визуальный эффект для элемента, который перетаскивается
    event.target.classList.add('dragging');
  }

  handleDragOverFromComponent(index, event) {
    event.preventDefault(); // Необходимо для разрешения drop
    event.dataTransfer.dropEffect = 'move';
  }

  handleDragEnterFromComponent(index, event) {
    event.preventDefault();
    // Добавляем класс для визуального индикатора места, куда можно сбросить
    event.target.classList.add('drag-over');
  }

  handleDropFromComponent(index, event) {
    event.preventDefault();

    // Удаляем визуальные эффекты
    event.target.classList.remove('drag-over');
    const elements = document.querySelectorAll('.tab-item');
    elements.forEach((el) => el.classList.remove('dragging'));

    const draggedIndex = parseInt(event.dataTransfer.getData('text/plain'));

    // Вызываем действие для обновления порядка
    this.reorderTabs(draggedIndex, index);
  }

  saveTabs() {
    this.storage.setItem('tabtimer-tabs', this.tabs);
  }

  startTimerLoop() {
    this.timerIntervalId = setInterval(() => {
      let shouldUpdate = false;
      const updatedTabs = this.tabs.map((tab) => {
        if (tab.isRunning) {
          shouldUpdate = true;
          let newTime = tab.time;
          
          if (tab.type === 'stopwatch') {
            // Для секундомера увеличиваем время
            newTime = tab.time + 1;
          } else if (tab.type === 'timer') {
            // Для таймера уменьшаем время, не опуская ниже 0
            newTime = Math.max(0, tab.time - 1);
            
            // Если таймер достиг 0, останавливаем его
            if (newTime === 0) {
              return {
                ...tab,
                isRunning: false,
                time: newTime,
                backgroundColor: tab.backgroundColor,
              };
            }
          } else if (tab.type === 'countdown') {
            // Для countdown пересчитываем время до целевой даты
            if (tab.targetDateTime) {
              const targetDate = new Date(tab.targetDateTime);
              const now = new Date();
              newTime = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
              
              // Если время истекло, останавливаем таймер
              if (newTime === 0) {
                return {
                  ...tab,
                  isRunning: false,
                  time: newTime,
                  backgroundColor: tab.backgroundColor,
                };
              }
            }
          }
          
          // Создаем новый объект с обновленным временем, сохраняя цвет фона
          return {
            ...tab,
            time: newTime,
            backgroundColor: tab.backgroundColor,
          };
        }
        return tab;
      });

      // Обновляем tracked массив, чтобы вызвать перерендер, только если есть изменения
      if (shouldUpdate) {
        this.tabs = updatedTabs;
        // Сохраняем обновленные табы в хранилище
        this.saveTabs();
      }
    }, 1000);
  }

  willDestroy() {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
    }
    super.willDestroy(...arguments);
  }
}
