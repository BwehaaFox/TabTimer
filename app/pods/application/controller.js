import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ApplicationController extends Controller {
  @service storage;

  @tracked tabs = [];
  @tracked activeSettingsTab = null;
  @tracked showSettingsModal = false;
  
  timerIntervalId = null;

  constructor() {
    super(...arguments);
    this.loadTabs();
    this.startTimerLoop();
  }

  loadTabs() {
    const savedTabs = this.storage.getItem('tabtimer-tabs');
    if (savedTabs) {
      this.tabs = savedTabs.map(tab => ({
        ...tab,
        isRunning: typeof tab.isRunning !== 'undefined' ? tab.isRunning : false,
        time: tab.time || 0,
        backgroundColor: tab.backgroundColor || this.getRandomBackgroundColor()
      }));
    } else {
      this.tabs = [];
    }
  }

  @action
  addTab() {
    const newTab = {
      id: Date.now(),
      name: '',
      time: 0,
      isRunning: false,
      backgroundColor: this.getRandomBackgroundColor()
    };
    this.tabs = [...this.tabs, newTab];
    this.saveTabs();
  }
  
  getRandomBackgroundColor() {
    // Генерируем случайный цвет, который будет хорошо контрастировать с белым текстом
    // Используем темные оттенки для лучшей контрастности с белым текстом
    const colors = [
      'rgba(30, 30, 30, 0.4)',   // Темно-серый
      'rgba(25, 25, 112, 0.4)',  // Темно-синий
      'rgba(139, 0, 0, 0.4)',    // Темно-красный
      'rgba(0, 100, 0, 0.4)',    // Темно-зеленый
      'rgba(139, 69, 19, 0.4)',  // Коричневый
      'rgba(75, 0, 130, 0.4)',   // Индиго
      'rgba(128, 0, 128, 0.4)',  // Фиолетовый
      'rgba(0, 0, 139, 0.4)'     // Темно-синий
    ];
    
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  @action
  toggleTimer(tab) {
    const tabIndex = this.tabs.findIndex(t => t.id === tab.id);
    if (tabIndex !== -1) {
      const updatedTab = { ...tab, isRunning: !tab.isRunning, backgroundColor: tab.backgroundColor };
      const updatedTabs = [
        ...this.tabs.slice(0, tabIndex),
        updatedTab,
        ...this.tabs.slice(tabIndex + 1)
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
  updateTabName(name) {
    if (this.activeSettingsTab) {
      const tabIndex = this.tabs.findIndex(t => t.id === this.activeSettingsTab.id);
      if (tabIndex !== -1) {
        const updatedTab = { ...this.activeSettingsTab, name: name, backgroundColor: this.activeSettingsTab.backgroundColor };
        const updatedTabs = [
          ...this.tabs.slice(0, tabIndex),
          updatedTab,
          ...this.tabs.slice(tabIndex + 1)
        ];
        this.tabs = updatedTabs;
        this.activeSettingsTab = updatedTab;
        this.saveTabs();
      }
    }
  }

  @action
  deleteTab(tabToDelete) {
    if (tabToDelete) {
      this.tabs = this.tabs.filter(tab => tab.id !== tabToDelete.id);
      if (this.activeSettingsTab && this.activeSettingsTab.id === tabToDelete.id) {
        this.closeSettings();
      }
      this.saveTabs();
    }
  }

  saveTabs() {
    this.storage.setItem('tabtimer-tabs', this.tabs);
  }

  startTimerLoop() {
    this.timerIntervalId = setInterval(() => {
      let shouldUpdate = false;
      const updatedTabs = this.tabs.map(tab => {
        if (tab.isRunning) {
          shouldUpdate = true;
          // Создаем новый объект с обновленным временем, сохраняя цвет фона
          return { ...tab, time: tab.time + 1, backgroundColor: tab.backgroundColor };
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
