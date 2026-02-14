import Service from '@ember/service';

export default class StorageService extends Service {
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Ошибка при чтении из localStorage:', error);
      return null;
    }
  }

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Ошибка при записи в localStorage:', error);
    }
  }

  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Ошибка при удалении из localStorage:', error);
    }
  }
}